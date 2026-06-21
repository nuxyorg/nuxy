import type { ClipboardItem, AddHistoryItemInput } from '../types.ts'

export function sortHistory(history: ClipboardItem[]): ClipboardItem[] {
  const sorted = [...history].sort(
    (a, b) => new Date(b.copiedAt).getTime() - new Date(a.copiedAt).getTime()
  )
  const pinned = sorted.filter((i) => i.pinned)
  const unpinned = sorted.filter((i) => !i.pinned)
  return [...pinned, ...unpinned]
}

export function createHistoryItem(input: AddHistoryItemInput): ClipboardItem {
  return {
    id: Math.random().toString(36).slice(2) + Date.now().toString(),
    text: input.text,
    image: input.image ?? null,
    copiedAt: new Date().toISOString(),
    pinned: false,
  }
}
