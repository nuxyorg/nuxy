/** True when the trimmed text is a magnet link or an http(s) URL pointing at a .torrent file. */
export function isTorrentLink(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (trimmed.toLowerCase().startsWith('magnet:?')) return true
  return /^https?:\/\/\S+\.torrent(?:[?#]\S*)?$/i.test(trimmed)
}
