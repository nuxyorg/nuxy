const React = window.React

import type { ClipboardItem } from '../types.ts'

const EXT_ID = 'com.nuxy.clipboard'

type SetItems = (updater: ClipboardItem[] | ((prev: ClipboardItem[]) => ClipboardItem[])) => void

interface Params {
  filteredItems: ClipboardItem[]
  searchQuery: string
  setItems: SetItems
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
}

interface Actions {
  copiedId: string | null
  handleCopy: (id: string, e?: { stopPropagation: () => void }) => void
  handleCopyFile: (id: string, e?: { stopPropagation: () => void }) => void
  handlePin: (id: string, e?: { stopPropagation: () => void }) => void
  handleUnpin: (id: string, e?: { stopPropagation: () => void }) => void
  handleDelete: (id: string, e?: { stopPropagation: () => void }) => void
}

export function useClipboardActions({
  filteredItems,
  searchQuery,
  setItems,
  setSelectedIndex,
}: Params): Actions {
  const [copiedId, setCopiedId] = React.useState<string | null>(null)

  function ipcMutate(channel: string, payload: string): Promise<ClipboardItem[]> {
    return window.core.ipc
      .invoke(EXT_ID, channel, payload)
      .then((res) => {
        const r = res as { success: boolean; data?: ClipboardItem[] } | null
        if (r?.success) setItems(r.data || [])
        return r?.data || []
      })
      .catch(() => [])
  }

  const handleCopy = (id: string, e?: { stopPropagation: () => void }): void => {
    e?.stopPropagation()
    if (!window.core?.ipc?.invoke) return
    ipcMutate('copyItem', id).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1800)
      setTimeout(() => window.core?.window?.hide?.(), 150)
    })
  }

  const handleCopyFile = (id: string, e?: { stopPropagation: () => void }): void => {
    e?.stopPropagation()
    if (!window.core?.ipc?.invoke) return
    ipcMutate('copyFile', id).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1800)
      setTimeout(() => window.core?.window?.hide?.(), 150)
    })
  }

  const handlePin = (id: string, e?: { stopPropagation: () => void }): void => {
    e?.stopPropagation()
    if (!window.core?.ipc?.invoke) return
    ipcMutate('pinItem', id)
  }

  const handleUnpin = (id: string, e?: { stopPropagation: () => void }): void => {
    e?.stopPropagation()
    if (!window.core?.ipc?.invoke) return
    ipcMutate('unpinItem', id)
  }

  const handleDelete = (id: string, e?: { stopPropagation: () => void }): void => {
    e?.stopPropagation()
    if (!window.core?.ipc?.invoke) return
    ipcMutate('deleteItem', id).then((newItems) => {
      setSelectedIndex((prev) => {
        if (prev < 0) return prev
        const newLen = searchQuery.trim()
          ? newItems.filter((i) => i.text?.toLowerCase().includes(searchQuery.toLowerCase())).length
          : newItems.length
        return newLen === 0 ? -1 : Math.min(prev, newLen - 1)
      })
    })
  }

  return { copiedId, handleCopy, handleCopyFile, handlePin, handleUnpin, handleDelete }
}
