const React = window.React

import type { ClipboardItem } from '../types.ts'

const EXT_ID = 'com.nuxy.clipboard'

type SetItems = (updater: ClipboardItem[] | ((prev: ClipboardItem[]) => ClipboardItem[])) => void

export function useClipboardHistory(): {
  items: ClipboardItem[]
  setItems: SetItems
} {
  const [items, setItems] = React.useState<ClipboardItem[]>([])

  const loadHistory = (): void => {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'getHistory')
      .then((res) => {
        const r = res as { success: boolean; data?: ClipboardItem[] } | null
        if (r?.success) {
          const newData = r.data || []
          setItems((prev: ClipboardItem[]) => {
            if (prev.length !== newData.length) return newData
            for (let i = 0; i < prev.length; i++) {
              if (prev[i].id !== newData[i].id) return newData
              if (prev[i].copiedAt !== newData[i].copiedAt) return newData
              if (prev[i].pinned !== newData[i].pinned) return newData
            }
            return prev
          })
        }
      })
      .catch(() => {})
  }

  React.useEffect(() => {
    loadHistory()
    const interval = setInterval(loadHistory, 1500)
    return () => clearInterval(interval)
  }, [])

  return { items, setItems }
}
