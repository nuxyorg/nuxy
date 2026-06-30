import type { TorrentItem } from '../types.ts'

/** Appends non-empty category/tags to a torrent's status meta line, separated by " · ". */
export function formatItemMeta(item: TorrentItem, statusLine: string): string {
  const parts = [statusLine]
  if (item.category.trim()) parts.push(item.category.trim())
  const tags = item.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
  if (tags.length > 0) parts.push(tags.join(', '))
  return parts.join(' · ')
}
