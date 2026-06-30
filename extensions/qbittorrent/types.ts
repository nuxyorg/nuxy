import type { IpcChannelMap } from '@nuxyorg/extension-sdk'

export type QbitAuthMethod = 'credentials' | 'apikey'

export interface QbitCredentials {
  host: string
  authMethod: QbitAuthMethod
  username: string
  password: string
  apiKey: string
}

/** Raw shape returned by qBittorrent's `/api/v2/torrents/info` endpoint. */
export interface RawQbitTorrent {
  hash: string
  name: string
  size: number
  progress: number
  dlspeed: number
  upspeed: number
  eta: number
  state: string
  category: string
  tags: string
  save_path: string
  magnet_uri?: string
}

export interface TorrentItem {
  hash: string
  name: string
  size: number
  progress: number
  dlspeed: number
  upspeed: number
  eta: number
  state: string
  category: string
  tags: string
  savePath: string
  magnetUri: string
}

export type TorrentPendingAction = 'pause' | 'resume' | 'recheck' | 'reannounce' | 'remove'

export interface AddTorrentPayload {
  url: string
}

export interface TorrentHashPayload {
  hash: string
}

export interface RemoveTorrentPayload {
  hash: string
  deleteFiles: boolean
}

export interface CopyMagnetPayload {
  magnetUri: string
}

export interface CopySavePathPayload {
  savePath: string
}

export interface OpenSavePathPayload {
  savePath: string
}

export type QbitConnectionState =
  | 'ready'
  | 'misconfigured'
  | 'unreachable'
  | 'auth_failed'
  | 'error'

export interface QbitStatusResult {
  state: QbitConnectionState
  message?: string
  host?: string
}

export interface IpcChannels extends IpcChannelMap {
  getStatus: { input: void; output: QbitStatusResult }
  list: { input: void; output: TorrentItem[] }
  add: { input: AddTorrentPayload; output: void }
  pause: { input: TorrentHashPayload; output: void }
  resume: { input: TorrentHashPayload; output: void }
  recheck: { input: TorrentHashPayload; output: void }
  reannounce: { input: TorrentHashPayload; output: void }
  remove: { input: RemoveTorrentPayload; output: void }
  copyMagnet: { input: CopyMagnetPayload; output: void }
  copySavePath: { input: CopySavePathPayload; output: void }
  openSavePath: { input: OpenSavePathPayload; output: void }
}
