export interface ClipboardItem {
  id: string
  text: string
  image: string | null
  copiedAt: string
  pinned: boolean
}

export interface AddHistoryItemInput {
  text: string
  image?: string | null
}
