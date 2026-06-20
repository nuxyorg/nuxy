import type { IpcChannelMap } from '@nuxyorg/extension-sdk'

export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'

/**
 * Identifies a download item owned by another extension (e.g. video-downloader).
 * When present, the underlying transfer process is managed by `extensionId`'s
 * backend — download-manager only mirrors its state and proxies pause/resume/
 * cancel back to the owner via `core.extensions.invoke`.
 */
export interface DownloadSource {
  extensionId: string
  jobId: string
}

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
  source?: DownloadSource
  thumbnail: string | null
}

export interface AddDownloadPayload {
  url: string
  fileName?: string
}

export interface DownloadIdPayload {
  id: string
}

export interface RegisterExternalPayload {
  extensionId: string
  jobId: string
  url: string
  fileName: string
  filePath?: string | null
  totalBytes?: number | null
  thumbnail?: string | null
}

export interface UpdateExternalPayload {
  extensionId: string
  jobId: string
  status?: DownloadStatus
  bytesDownloaded?: number
  totalBytes?: number | null
  speedBps?: number
  error?: string | null
  filePath?: string | null
}

export interface RemoveExternalPayload {
  extensionId: string
  jobId: string
}

export interface IpcChannels extends IpcChannelMap {
  list: { input: void; output: DownloadItem[] }
  add: { input: AddDownloadPayload; output: DownloadItem }
  pause: { input: DownloadIdPayload; output: void }
  resume: { input: DownloadIdPayload; output: void }
  cancel: { input: DownloadIdPayload; output: void }
  remove: { input: DownloadIdPayload; output: void }
  registerExternal: { input: RegisterExternalPayload; output: DownloadItem }
  updateExternal: { input: UpdateExternalPayload; output: void }
  removeExternal: { input: RemoveExternalPayload; output: void }
}
