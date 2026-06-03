import type { ClipboardItem } from '../types.ts'

export type ItemType = 'image' | 'color' | 'url' | 'file' | 'text'
export type FileIconType = 'image-file' | 'pdf' | 'code' | 'archive' | 'document' | 'file'

export function getItemType(item: ClipboardItem): ItemType {
  const txt = item.text?.trim() || ''
  if (item.image) return 'image'
  if (/^#([0-9a-f]{3,8})$/i.test(txt) || /^rgba?\(\s*[\d.]+/.test(txt) || /^hsla?\(/.test(txt))
    return 'color'
  if (/^https?:\/\//i.test(txt)) return 'url'
  if (/^(\/|~\/)/.test(txt) && txt.length > 2) return 'file'
  if (/^[a-zA-Z]:\\/.test(txt)) return 'file'
  return 'text'
}

export function getFilename(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() || path
}

export function getParentDir(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean)
  if (parts.length <= 1) return ''
  return parts.slice(0, -1).join('/')
}

export function getFileExtension(path: string): string {
  const name = getFilename(path)
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : ''
}

export function getFileIconType(ext: string): FileIconType {
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff', 'avif'].includes(ext))
    return 'image-file'
  if (ext === 'pdf') return 'pdf'
  if (
    [
      'js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'cs', 'php',
      'html', 'css', 'json', 'yaml', 'yml', 'sh', 'bash', 'fish', 'zsh', 'toml', 'xml',
      'vue', 'svelte', 'kt', 'swift',
    ].includes(ext)
  )
    return 'code'
  if (['zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar'].includes(ext)) return 'archive'
  if (['md', 'txt', 'doc', 'docx', 'odt', 'rtf', 'pages'].includes(ext)) return 'document'
  return 'file'
}

export function timeAgo(dateString: string): string {
  if (!dateString) return ''
  const m = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function getListLabel(item: ClipboardItem, type: ItemType, isCopied: boolean): string {
  if (isCopied) return 'Copied!'
  const txt = item.text?.trim() || ''
  if (type === 'image') return item.text && item.text !== 'Image' ? item.text : 'Image'
  if (type === 'file') return getFilename(txt)
  return txt
}

export function getListMeta(item: ClipboardItem, type: ItemType, isCurrent: boolean): string {
  if (isCurrent) return 'current'
  const txt = item.text?.trim() || ''
  if (type === 'file') {
    const parent = getParentDir(txt)
    return parent ? `…/${parent}` : timeAgo(item.copiedAt)
  }
  if (type === 'color') return 'Color'
  if (type === 'url') return 'URL'
  if (type === 'image') return 'Image'
  return timeAgo(item.copiedAt)
}
