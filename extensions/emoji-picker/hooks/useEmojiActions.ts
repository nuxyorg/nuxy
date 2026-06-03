const React = window.React

const EXT_ID = 'com.nuxy.emoji-picker'

const COPIED_DISPLAY_MS = 1200
const HIDE_DELAY_MS = 150
const PASTE_DELAY_MS = 50

interface Params {
  setFavorites: React.Dispatch<React.SetStateAction<string[]>>
}

interface EmojiActions {
  copiedEmoji: string | null
  copyEmoji: (emoji: string) => void
  toggleFavorite: (emoji: string) => void
}

export function useEmojiActions({ setFavorites }: Params): EmojiActions {
  const [copiedEmoji, setCopiedEmoji] = React.useState<string | null>(null)

  const copyEmoji = React.useCallback((emoji: string) => {
    window.core?.ipc
      ?.invoke(EXT_ID, 'copy', emoji)
      .then(() => {
        setCopiedEmoji(emoji)
        setTimeout(() => setCopiedEmoji(null), COPIED_DISPLAY_MS)
        setTimeout(() => {
          window.core?.window?.hide?.()
          setTimeout(() => window.core?.ipc?.invoke(EXT_ID, 'paste'), PASTE_DELAY_MS)
        }, HIDE_DELAY_MS)
      })
      .catch(() => {})
  }, [])

  const toggleFavorite = React.useCallback(
    (emoji: string) => {
      window.core?.ipc
        ?.invoke(EXT_ID, 'toggleFavorite', emoji)
        .then((res) => {
          const r = res as { success: boolean; data?: string[] } | null
          if (r?.success) setFavorites(r.data || [])
        })
        .catch(() => {})
    },
    [setFavorites]
  )

  return { copiedEmoji, copyEmoji, toggleFavorite }
}
