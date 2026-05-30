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

export interface DownloadJob {
  jobId: string
  url: string
  formatId: string
  progress: number
  status: 'running' | 'done' | 'error'
  outputPath?: string
  metadata?: {
    title: string
    thumbnail: string | null
    duration: number | null
    uploader: string | null
  }
  resolution?: string
  handle: {
    onData: (handler: (chunk: string) => void) => void
    onClose: (handler: (code: number | null) => void) => void
    kill: (signal?: string) => void
  }
}

export interface DownloadJobPublic {
  jobId: string
  url: string
  formatId: string
  progress: number
  status: 'running' | 'done' | 'error'
  outputPath?: string
  metadata?: {
    title: string
    thumbnail: string | null
    duration: number | null
    uploader: string | null
  }
  resolution?: string
}

export interface VideoDownloaderConfig {
  outputDir: string
}

export interface HistoryItem {
  id: string
  url: string
  title: string
  thumbnail: string | null
  duration: number | null
  uploader: string | null
  formatId: string
  resolution: string
  outputPath: string | null
  timestamp: number
}
