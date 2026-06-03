const React = window.React

import type { EmojiCategory, EmojiEntry } from '../types.ts'

const EXT_ID = 'com.nuxy.emoji-picker'

interface EmojiData {
  emojiCategories: EmojiCategory[] | null
  emojiMap: Map<string, EmojiEntry> | null
  favorites: string[]
  setFavorites: React.Dispatch<React.SetStateAction<string[]>>
}

export function useEmojiData(extensionId: string): EmojiData {
  const [emojiCategories, setEmojiCategories] = React.useState<EmojiCategory[] | null>(null)
  const [emojiMap, setEmojiMap] = React.useState<Map<string, EmojiEntry> | null>(null)
  const [favorites, setFavorites] = React.useState<string[]>([])

  React.useEffect(() => {
    fetch(`nuxy-ext://${extensionId}/emojis.json`)
      .then((r) => r.json())
      .then((data: EmojiCategory[]) => {
        setEmojiCategories(data)
        const map = new Map<string, EmojiEntry>(
          data.flatMap((cat) => cat.emojis.map((em) => [em.e, em] as [string, EmojiEntry]))
        )
        setEmojiMap(map)
      })
      .catch(() => {})
  }, [extensionId])

  React.useEffect(() => {
    window.core?.ipc
      ?.invoke(EXT_ID, 'getFavorites')
      .then((res) => {
        const r = res as { success: boolean; data?: string[] } | null
        if (r?.success) setFavorites(r.data || [])
      })
      .catch(() => {})
  }, [])

  return { emojiCategories, emojiMap, favorites, setFavorites }
}
