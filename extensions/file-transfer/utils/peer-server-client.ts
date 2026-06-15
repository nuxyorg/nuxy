import type { PeerServerConfig, PeerServerMessage } from '../types.ts'

export interface OutgoingPeerMessage {
  type: string
  dst: string
  payload: Record<string, unknown>
}

function randomToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

function randomConnectionId(): string {
  return `dc_${Math.random().toString(36).slice(2, 12)}`
}

export const DEFAULT_PEER_SERVER: PeerServerConfig = {
  host: '0.peerjs.com',
  port: 443,
  key: 'peerjs',
  secure: true,
}

export class PeerServerClient {
  private ws: WebSocket | null = null
  private handlers = new Set<(msg: PeerServerMessage) => void>()
  private openPromise: Promise<void> | null = null

  constructor(
    readonly peerId: string,
    private readonly config: PeerServerConfig = DEFAULT_PEER_SERVER
  ) {}

  connect(): Promise<void> {
    if (this.openPromise) return this.openPromise

    const protocol = this.config.secure ? 'wss' : 'ws'
    const token = randomToken()
    const url =
      `${protocol}://${this.config.host}:${this.config.port}/peerjs` +
      `?key=${encodeURIComponent(this.config.key)}` +
      `&id=${encodeURIComponent(this.peerId)}` +
      `&token=${encodeURIComponent(token)}` +
      '&version=1.5.4'

    this.openPromise = new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url)
      this.ws = ws
      let settled = false

      const fail = (err: Error) => {
        if (settled) return
        settled = true
        reject(err)
      }

      ws.onopen = () => {
        /* wait for OPEN message */
      }

      ws.onerror = () => fail(new Error('signaling.connectionFailed'))

      ws.onclose = () => {
        if (!settled) fail(new Error('signaling.connectionClosed'))
      }

      ws.onmessage = (event) => {
        let msg: PeerServerMessage
        try {
          msg = JSON.parse(String(event.data)) as PeerServerMessage
        } catch {
          return
        }

        if (!settled && msg.type === 'OPEN') {
          settled = true
          resolve()
        }

        for (const handler of this.handlers) handler(msg)
      }
    })

    return this.openPromise
  }

  onMessage(handler: (msg: PeerServerMessage) => void): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  send(message: OutgoingPeerMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('signaling.notConnected')
    }
    this.ws.send(JSON.stringify(message))
  }

  close(): void {
    this.handlers.clear()
    if (this.ws) {
      this.ws.onclose = null
      this.ws.onerror = null
      this.ws.onmessage = null
      this.ws.close()
      this.ws = null
    }
    this.openPromise = null
  }
}

export function buildIceServers(stunServer: string): RTCIceServer[] {
  const servers: RTCIceServer[] = []
  if (stunServer.trim()) servers.push({ urls: stunServer.trim() })
  return servers
}

export { randomConnectionId }
