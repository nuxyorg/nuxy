import type { VideoFormat, DownloadJobPublic, HistoryItem } from '../types.ts'

export type TabId = 'recommended' | 'video_audio' | 'audio_only' | 'video_only' | 'all' | 'downloads'

export interface CombinedListItem {
  jobId: string
  url: string
  formatId: string
  progress: number
  status: 'running' | 'done' | 'error'
  title: string
  thumbnail: string | null
  duration: number | null
  uploader: string | null
  resolution: string
  outputPath: string | null
  timestamp: number
}

export const TABS: { id: TabId; label: string }[] = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'video_audio', label: 'Video & Audio' },
  { id: 'audio_only', label: 'Audio Only' },
  { id: 'video_only', label: 'Video Only' },
  { id: 'all', label: 'All Streams' },
]

export function fmtSize(bytes: number | null): string {
  if (!bytes) return '?'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export function fmtDuration(sec: number | null): string {
  if (sec === null || sec === undefined) return ''
  const hrs = Math.floor(sec / 3600)
  const mins = Math.floor((sec % 3600) / 60)
  const secs = sec % 60
  if (hrs > 0)
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function truncate(str: string, max = 50): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

export function getResolutionHeight(res: string): number {
  const m = /(\d+)x(\d+)/.exec(res) || /(\d+)p/.exec(res)
  return m ? parseInt(m[2] || m[1]) : 0
}

export function getVideoAndAudioFormats(formats: VideoFormat[]): VideoFormat[] {
  const merged: VideoFormat[] = []
  formats
    .filter((f) => f.vcodec !== 'none')
    .forEach((f) => {
      if (f.acodec !== 'none') merged.push(f)
      else
        merged.push({
          ...f,
          formatId: `${f.formatId}+bestaudio/best`,
          note: f.note ? `${f.note} + audio` : 'video + audio',
        })
    })
  return merged.sort((a, b) => {
    if (getResolutionHeight(b.resolution) !== getResolutionHeight(a.resolution))
      return getResolutionHeight(b.resolution) - getResolutionHeight(a.resolution)
    return (b.tbr || 0) - (a.tbr || 0)
  })
}

export function getRecommendedFormats(formats: VideoFormat[]): VideoFormat[] {
  const recs: VideoFormat[] = [
    {
      formatId: 'bestvideo+bestaudio/best',
      ext: 'mp4',
      resolution: 'Best Quality',
      filesize: null,
      note: 'Highest video & audio merged',
    },
    {
      formatId: 'bestaudio[ext=m4a]/bestaudio/best',
      ext: 'm4a',
      resolution: 'audio only',
      filesize: null,
      note: 'Highest audio quality',
    },
  ]
  const added = new Set<number>()
  getVideoAndAudioFormats(formats).forEach((f) => {
    const h = getResolutionHeight(f.resolution)
    if ([2160, 1440, 1080, 720, 480, 360].includes(h) && !added.has(h)) {
      recs.push({ ...f, note: `${h}p resolution` })
      added.add(h)
    }
  })
  return recs
}

export function filterFormats(formats: VideoFormat[], tab: TabId): VideoFormat[] {
  switch (tab) {
    case 'recommended':
      return getRecommendedFormats(formats)
    case 'video_audio':
      return getVideoAndAudioFormats(formats)
    case 'audio_only':
      return formats
        .filter((f) => f.vcodec === 'none' || f.resolution === 'audio only')
        .sort((a, b) => (b.tbr || 0) - (a.tbr || 0))
    case 'video_only':
      return formats.filter((f) => f.vcodec !== 'none' && f.acodec === 'none')
    case 'all':
    default:
      return formats
  }
}

export function buildCombinedList(jobs: DownloadJobPublic[], history: HistoryItem[]): CombinedListItem[] {
  const list: CombinedListItem[] = []
  for (const job of jobs) {
    list.push({
      jobId: job.jobId,
      url: job.url,
      formatId: job.formatId,
      progress: job.progress,
      status: job.status,
      title: job.metadata?.title || 'Unknown Video',
      thumbnail: job.metadata?.thumbnail || null,
      duration: job.metadata?.duration || null,
      uploader: job.metadata?.uploader || null,
      resolution: job.resolution || 'Unknown',
      outputPath: job.outputPath || null,
      timestamp: Date.now(),
    })
  }
  for (const item of history) {
    if (!list.some((x) => x.jobId === item.id)) {
      list.push({
        jobId: item.id,
        url: item.url,
        formatId: item.formatId,
        progress: item.outputPath ? 100 : 0,
        status: item.outputPath ? 'done' : 'error',
        title: item.title,
        thumbnail: item.thumbnail,
        duration: item.duration,
        uploader: item.uploader,
        resolution: item.resolution,
        outputPath: item.outputPath,
        timestamp: item.timestamp,
      })
    }
  }
  return list.sort((a, b) => {
    if (a.status === 'running' && b.status !== 'running') return -1
    if (a.status !== 'running' && b.status === 'running') return 1
    return b.timestamp - a.timestamp
  })
}

export function getFormatBadge(f: VideoFormat): { variant: string; text: string } {
  const isAudioOnly = f.vcodec === 'none' || f.resolution === 'audio only'
  const hasAudio = f.acodec !== 'none' || f.formatId.includes('+bestaudio')
  let variant = 'default'
  let text = f.ext.toUpperCase()
  if (isAudioOnly) {
    variant = 'warning'
    text = 'AUDIO'
  } else if (
    f.resolution.includes('1080') ||
    f.resolution.includes('2160') ||
    f.resolution.includes('1440')
  ) {
    variant = 'success'
  } else if (!hasAudio) {
    variant = 'danger'
    text = 'SILENT'
  }
  return { variant, text }
}

export function getDownloadBadge(item: CombinedListItem): { variant: string; text: string } {
  if (item.status === 'running') {
    return { variant: 'primary', text: `Downloading (${item.progress.toFixed(1)}%)` }
  }
  if (item.status === 'done') {
    return { variant: 'success', text: item.resolution || item.formatId }
  }
  if (item.status === 'error') {
    return { variant: 'danger', text: 'ERROR' }
  }
  return { variant: 'default', text: item.resolution || item.formatId }
}
