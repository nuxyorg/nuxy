const React = window.React

import type { Snippet } from '../types.ts'
import { invoke } from '../utils/format.ts'

interface Params {
  snippets: Snippet[]
  selectedIndex: number
  setSnippets: React.Dispatch<React.SetStateAction<Snippet[]>>
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
  query: string
  loadSnippets: (q?: string) => void
}

interface Actions {
  copiedId: string | null
  handleCopy: (item: Snippet) => void
  handleSaveClipboard: () => void
  handleDelete: () => void
}

export function useSnippetsActions({
  snippets,
  selectedIndex,
  setSnippets,
  setSelectedIndex,
  query,
  loadSnippets,
}: Params): Actions {
  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  const copiedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCopy = React.useCallback((item: Snippet): void => {
    invoke<{ copied: true }>('copySnippet', { id: item.id })
      .then(() => {
        if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
        setCopiedId(item.id)
        copiedTimerRef.current = setTimeout(() => setCopiedId(null), 1500)
        window.core.ipc
          .invoke('com.nuxy.snippets', 'getSettings')
          .then((res) => {
            const r = res as { success?: boolean; data?: { closeAfterCopy: boolean } } | null
            if (r?.data?.closeAfterCopy !== false) {
              setTimeout(() => window.core?.window?.hide?.(), 200)
            }
          })
          .catch(() => {
            setTimeout(() => window.core?.window?.hide?.(), 200)
          })
      })
      .catch(() => {})
  }, [])

  const handleSaveClipboard = React.useCallback((): void => {
    invoke<Snippet>('saveClipboardAsSnippet')
      .then(() => loadSnippets(query || undefined))
      .catch(() => {})
  }, [query, loadSnippets])

  const handleDelete = React.useCallback((): void => {
    const item = snippets[selectedIndex]
    if (!item) return
    invoke<Snippet[]>('deleteSnippet', { id: item.id })
      .then((updated) => {
        setSnippets(updated)
        setSelectedIndex((prev: number) => {
          if (updated.length === 0) return -1
          return Math.min(prev, updated.length - 1)
        })
      })
      .catch(() => {})
  }, [snippets, selectedIndex, setSnippets, setSelectedIndex])

  return { copiedId, handleCopy, handleSaveClipboard, handleDelete }
}
