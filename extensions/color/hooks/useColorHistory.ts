const React = window.React

import type { SavedColor } from '../types.ts'

const EXT_ID = 'com.nuxy.color'

export function useColorHistory(): {
  items: SavedColor[]
  setItems: React.Dispatch<React.SetStateAction<SavedColor[]>>
} {
  const [items, setItems] = React.useState<SavedColor[]>([])

  React.useEffect(() => {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'getHistory')
      .then((res) => {
        const r = res as { success: boolean; data?: SavedColor[] } | null
        if (r?.success) setItems(r.data ?? [])
      })
      .catch(() => {})
  }, [])

  return { items, setItems }
}
