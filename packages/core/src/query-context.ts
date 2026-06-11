export type QueryType =
  | 'text'
  | 'url'
  | 'color'
  | 'math'
  | 'path'
  | 'email'
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'archive'

export interface QueryContext {
  raw: string
  /** Detected types, ordered by confidence. Always ends with 'text' as fallback. */
  types: QueryType[]
  /** Parsed URL when 'url' is in types. */
  url?: URL
  /** Normalized color string when 'color' is in types (e.g. "#ff6600"). */
  color?: string
  /** File path as entered when 'path' is in types. */
  filePath?: string
  /** File extension without dot, e.g. "mp4". Present for image/video/audio/pdf/archive. */
  fileExt?: string
}

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico', 'avif', 'tiff'])
const VIDEO_EXTS = new Set(['mp4', 'avi', 'mkv', 'mov', 'webm', 'flv', 'wmv', 'm4v', 'mpeg'])
const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'opus', 'wma'])
const ARCHIVE_EXTS = new Set(['zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar', 'tgz'])
const VIDEO_HOSTS = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com', 'twitch.tv']

function extToType(ext: string): QueryType | null {
  if (IMAGE_EXTS.has(ext)) return 'image'
  if (VIDEO_EXTS.has(ext)) return 'video'
  if (AUDIO_EXTS.has(ext)) return 'audio'
  if (ext === 'pdf') return 'pdf'
  if (ARCHIVE_EXTS.has(ext)) return 'archive'
  return null
}

function classifyFromExt(ext: string, ctx: QueryContext, types: QueryType[]): void {
  ctx.fileExt = ext
  const fileType = extToType(ext)
  if (fileType && !types.includes(fileType)) types.push(fileType)
}

export function classifyQuery(raw: string): QueryContext {
  const text = raw.trim()
  const types: QueryType[] = []
  const ctx: QueryContext = { raw, types }

  if (!text) {
    types.push('text')
    return ctx
  }

  // URL
  if (/^(https?|ftp):\/\//i.test(text) || /^www\./i.test(text)) {
    try {
      const urlStr = /^https?:\/\//i.test(text) ? text : `https://${text}`
      const url = new URL(urlStr)
      types.push('url')
      ctx.url = url

      const host = url.hostname.replace(/^www\./, '')
      if (VIDEO_HOSTS.some((h) => host === h || host.endsWith('.' + h))) {
        types.push('video')
      }

      const lastSeg = url.pathname.split('/').pop() ?? ''
      const dotIdx = lastSeg.lastIndexOf('.')
      if (dotIdx !== -1) {
        classifyFromExt(lastSeg.slice(dotIdx + 1).toLowerCase(), ctx, types)
      }
    } catch {
      // malformed URL — fall through to text
    }
  }

  // Color — #hex or functional notation
  if (
    /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(text) ||
    /^(rgb|rgba|hsl|hsla)\s*\(/i.test(text)
  ) {
    types.push('color')
    ctx.color = text.toLowerCase()
  }

  // Math — digits + operators, at least one operator present, no URL
  if (
    !types.includes('url') &&
    /^[\d\s+\-*/^%().]+$/.test(text) &&
    /[+\-*/^%]/.test(text)
  ) {
    types.push('math')
  }

  // Filesystem path
  if (/^(\/|~\/)/.test(text)) {
    types.push('path')
    ctx.filePath = text

    const lastSeg = text.split('/').pop() ?? ''
    const dotIdx = lastSeg.lastIndexOf('.')
    if (dotIdx !== -1) {
      classifyFromExt(lastSeg.slice(dotIdx + 1).toLowerCase(), ctx, types)
    }
  }

  // Email
  if (!types.includes('url') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
    types.push('email')
  }

  types.push('text')
  return ctx
}
