import type { IpcChannelMap } from '@nuxyorg/extension-sdk'

export type TransferMode = 'menu' | 'send' | 'receive'
export type TransferPhase = 'idle' | 'waiting' | 'connecting' | 'transferring' | 'done' | 'error'

export interface TransferProgress {
  bytesTransferred: number
  totalBytes: number
  speedBps: number
  etaSeconds: number | null
}

export interface FileMeta {
  name: string
  size: number
  lastModified: number
}

export interface TransferSettings {
  downloadDir: string
  maxFileSizeMb: number
  signalingHost: string
  signalingPort: number
  stunServer: string
}

export interface InitReceivePayload {
  fileName: string
  totalSize: number
}

export interface InitReceiveResult {
  sessionId: string
  filePath: string
}

export interface WriteChunkPayload {
  sessionId: string
  chunkBase64: string
}

export interface FinishReceivePayload {
  sessionId: string
}

export interface FinishReceiveResult {
  filePath: string
  bytesWritten: number
}

export interface AbortReceivePayload {
  sessionId: string
}

export interface CopyCodePayload {
  code: string
}

export type PeerServerMessageType = 'OPEN' | 'OFFER' | 'ANSWER' | 'CANDIDATE' | 'LEAVE' | 'EXPIRE'

export interface PeerServerMessage {
  type: PeerServerMessageType
  src?: string
  dst?: string
  payload?: Record<string, unknown>
}

export interface PeerServerConfig {
  host: string
  port: number
  key: string
  secure: boolean
}

export interface FileMetaMessage {
  type: 'meta'
  name: string
  size: number
  mime: string
}

export interface FileDoneMessage {
  type: 'done'
}

export type ControlMessage = FileMetaMessage | FileDoneMessage

export interface IpcChannels extends IpcChannelMap {
  getSettings: { input: void; output: TransferSettings }
  initReceive: { input: InitReceivePayload; output: InitReceiveResult }
  writeChunk: { input: WriteChunkPayload; output: void }
  finishReceive: { input: FinishReceivePayload; output: FinishReceiveResult }
  abortReceive: { input: AbortReceivePayload; output: void }
  copyCode: { input: CopyCodePayload; output: void }
}
