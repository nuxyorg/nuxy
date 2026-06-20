import type { TabId, VideoFormat } from '../types.ts'

export function fmtSize(bytes: number | null): string {
  if (!bytes) return '?'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
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
