import type { PeerServerMessage } from '../types.ts'
import {
  PeerServerClient,
  buildIceServers,
  randomConnectionId,
  type OutgoingPeerMessage,
} from './peer-server-client.ts'
import type { TransferProgress } from '../types.ts'
import { CHUNK_SIZE, SpeedTracker, createProgress } from './transfer-stats.ts'
import {
  decodeControlMessage,
  encodeDoneMessage,
  encodeMetaMessage,
  isBinaryChunk,
} from './transfer-protocol.ts'

export interface WebRtcSessionOptions {
  peerId: string
  remotePeerId?: string
  role: 'sender' | 'receiver'
  signaling: PeerServerClient
  stunServer: string
  file?: File
  onProgress?: (progress: TransferProgress) => void
  onMeta?: (meta: { name: string; size: number; mime: string }) => void
  onChunk?: (chunk: ArrayBuffer) => void | Promise<void>
  onDone?: () => void
  onError?: (error: Error) => void
}

export class WebRtcFileSession {
  private pc: RTCPeerConnection | null = null
  private dc: RTCDataChannel | null = null
  private connectionId = randomConnectionId()
  private remotePeerId: string
  private role: 'sender' | 'receiver'
  private signaling: PeerServerClient
  private file: File | undefined
  private unsubSignaling: (() => void) | null = null
  private speed = new SpeedTracker()
  private bytesTransferred = 0
  private totalBytes = 0
  private closed = false

  constructor(private readonly options: WebRtcSessionOptions) {
    this.remotePeerId = options.remotePeerId ?? ''
    this.role = options.role
    this.signaling = options.signaling
    this.file = options.file
  }

  async start(): Promise<void> {
    const iceServers = buildIceServers(this.options.stunServer)
    this.pc = new RTCPeerConnection({ iceServers })

    this.unsubSignaling = this.signaling.onMessage((msg) => {
      void this.handleSignalingMessage(msg)
    })

    this.pc.onicecandidate = (event) => {
      if (!event.candidate) return
      this.safeSend({
        type: 'CANDIDATE',
        dst: this.remotePeerId,
        payload: {
          candidate: event.candidate,
          type: 'data',
          connectionId: this.connectionId,
        },
      })
    }

    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState
      if (state === 'failed' || state === 'disconnected') {
        this.fail(new Error('webrtc.connectionFailed'))
      }
    }

    if (this.role === 'receiver') {
      this.dc = this.pc.createDataChannel('file-transfer', { ordered: true })
      this.attachDataChannel(this.dc)
      const offer = await this.pc.createOffer()
      await this.pc.setLocalDescription(offer)
      this.safeSend({
        type: 'OFFER',
        dst: this.remotePeerId,
        payload: {
          sdp: this.pc.localDescription,
          type: 'data',
          connectionId: this.connectionId,
          label: 'file-transfer',
          serialization: 'binary',
          reliable: true,
        },
      })
      return
    }

    this.pc.ondatachannel = (event) => {
      this.dc = event.channel
      this.attachDataChannel(event.channel)
    }
  }

  async sendFile(file: File): Promise<void> {
    await this.waitForChannelOpen()
    const meta = encodeMetaMessage({
      type: 'meta',
      name: file.name,
      size: file.size,
      mime: file.type || 'application/octet-stream',
    })
    this.dc!.send(meta)
    this.totalBytes = file.size
    this.bytesTransferred = 0
    this.speed.reset()
    this.emitProgress()

    let offset = 0
    while (offset < file.size) {
      const slice = file.slice(offset, offset + CHUNK_SIZE)
      const buffer = await slice.arrayBuffer()
      this.dc!.send(buffer)
      offset += buffer.byteLength
      this.bytesTransferred = offset
      this.emitProgress()
    }

    this.dc!.send(encodeDoneMessage())
    this.emitProgress()
    this.options.onDone?.()
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    this.unsubSignaling?.()
    this.unsubSignaling = null
    this.dc?.close()
    this.dc = null
    this.pc?.close()
    this.pc = null
  }

  private attachDataChannel(channel: RTCDataChannel): void {
    channel.binaryType = 'arraybuffer'
    channel.onmessage = (event) => {
      void this.handleDataMessage(event.data)
    }
    channel.onerror = () => this.fail(new Error('webrtc.channelError'))
    channel.onopen = () => {
      if (this.role === 'sender' && this.file) {
        void this.sendFile(this.file)
      }
    }
  }

  private async handleDataMessage(data: string | ArrayBuffer | Blob): Promise<void> {
    if (typeof data === 'string') {
      const control = decodeControlMessage(data)
      if (!control) return
      if (control.type === 'meta') {
        this.totalBytes = control.size
        this.bytesTransferred = 0
        this.speed.reset()
        this.options.onMeta?.({
          name: control.name,
          size: control.size,
          mime: control.mime,
        })
        this.emitProgress()
      } else if (control.type === 'done') {
        this.emitProgress()
        this.options.onDone?.()
      }
      return
    }

    let buffer: ArrayBuffer
    if (data instanceof Blob) {
      buffer = await data.arrayBuffer()
    } else if (isBinaryChunk(data)) {
      buffer = data
    } else {
      return
    }

    this.bytesTransferred += buffer.byteLength
    this.emitProgress()
    await this.options.onChunk?.(buffer)
  }

  private async handleSignalingMessage(msg: PeerServerMessage): Promise<void> {
    if (!this.pc || this.closed) return

    if (this.role === 'sender' && msg.type === 'OFFER') {
      if (msg.src) this.remotePeerId = msg.src
    }

    const remote = msg.src ?? ''
    if (this.remotePeerId && remote !== this.remotePeerId) return
    if (!this.remotePeerId && msg.type !== 'OFFER') return

    try {
      if (msg.type === 'OFFER' && this.role === 'sender') {
        const payload = msg.payload as {
          sdp?: RTCSessionDescriptionInit
          connectionId?: string
        }
        if (payload.connectionId) this.connectionId = payload.connectionId
        if (!payload.sdp) return
        await this.pc.setRemoteDescription(payload.sdp)
        const answer = await this.pc.createAnswer()
        await this.pc.setLocalDescription(answer)
        this.safeSend({
          type: 'ANSWER',
          dst: this.remotePeerId,
          payload: {
            sdp: this.pc.localDescription,
            type: 'data',
            connectionId: this.connectionId,
          },
        })
        return
      }

      if (msg.type === 'ANSWER' && this.role === 'receiver') {
        const payload = msg.payload as { sdp?: RTCSessionDescriptionInit }
        if (!payload.sdp) return
        await this.pc.setRemoteDescription(payload.sdp)
        return
      }

      if (msg.type === 'CANDIDATE') {
        const payload = msg.payload as { candidate?: RTCIceCandidateInit }
        if (!payload.candidate) return
        await this.pc.addIceCandidate(payload.candidate)
      }
    } catch (err) {
      this.fail(err instanceof Error ? err : new Error('webrtc.negotiationFailed'))
    }
  }

  private waitForChannelOpen(): Promise<void> {
    const channel = this.dc
    if (!channel) return Promise.reject(new Error('webrtc.noDataChannel'))
    if (channel.readyState === 'open') return Promise.resolve()
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('webrtc.channelTimeout')), 30_000)
      channel.onopen = () => {
        clearTimeout(timer)
        resolve()
      }
      channel.onerror = () => {
        clearTimeout(timer)
        reject(new Error('webrtc.channelError'))
      }
    })
  }

  private emitProgress(): void {
    const speedBps = this.speed.update(this.bytesTransferred)
    this.options.onProgress?.(createProgress(this.bytesTransferred, this.totalBytes, speedBps))
  }

  private safeSend(message: OutgoingPeerMessage): void {
    try {
      this.signaling.send(message)
    } catch (err) {
      this.fail(err instanceof Error ? err : new Error('signaling.sendFailed'))
    }
  }

  private fail(error: Error): void {
    if (this.closed) return
    this.options.onError?.(error)
    this.close()
  }
}
