import type { IpcChannelMap } from '@nuxyorg/extension-sdk'

export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface DownloadItem {
  id: string
  url: string
  fileName: string
  filePath: string
  status: DownloadStatus
  bytesDownloaded: number
  totalBytes: number | null
  speedBps: number
  error: string | null
  createdAt: string
  updatedAt: string
}

export interface AddDownloadPayload {
  url: string
  fileName?: string
}

export interface DownloadIdPayload {
  id: string
}

export interface IpcChannels extends IpcChannelMap {
  list: { input: void; output: DownloadItem[] }
  add: { input: AddDownloadPayload; output: DownloadItem }
  pause: { input: DownloadIdPayload; output: void }
  resume: { input: DownloadIdPayload; output: void }
  cancel: { input: DownloadIdPayload; output: void }
  remove: { input: DownloadIdPayload; output: void }
}
