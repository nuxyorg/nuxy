import type { IpcChannelMap } from '@nuxyorg/extension-sdk'

export interface VideoFormat {
  formatId: string
  ext: string
  resolution: string
  filesize: number | null
  note: string
  vcodec?: string
  acodec?: string
  fps?: number | null
  tbr?: number | null
}

export interface VideoMetadata {
  title: string
  thumbnail: string | null
  duration: number | null
  uploader: string | null
  formats: VideoFormat[]
}

export interface VideoMetaPayload {
  title: string
  thumbnail: string | null
  duration: number | null
  uploader: string | null
}

export interface StatusPayload {
  installed: boolean
}

export interface GetFormatsPayload {
  url: string
}

export interface DownloadPayload {
  url: string
  formatId: string
  resolution: string
  metadata: VideoMetaPayload
}

export interface JobIdPayload {
  jobId: string
}

export type TabId = 'recommended' | 'video_audio' | 'audio_only' | 'video_only' | 'all'

export interface IpcChannels extends IpcChannelMap {
  status: { input: void; output: StatusPayload }
  getFormats: { input: GetFormatsPayload; output: VideoMetadata }
  download: { input: DownloadPayload; output: { jobId: string } }
  pause: { input: JobIdPayload; output: void }
  resume: { input: JobIdPayload; output: void }
  cancel: { input: JobIdPayload; output: void }
}
