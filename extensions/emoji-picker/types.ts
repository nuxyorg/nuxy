export interface EmojiEntry {
  /** The emoji character itself */
  e: string
  /** Human-readable name */
  n: string
  /** Keywords (comma-separated or space-separated) */
  k: string
}

export interface EmojiCategory {
  id: string
  label: string
  icon: string | null
  emojis: EmojiEntry[]
}

export interface CopyResult {
  ok: boolean
}
