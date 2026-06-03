const React = window.React

import type { SavedColor } from '../types.ts'

const EXT_ID = 'com.nuxy.color'

interface Params {
  setItems: React.Dispatch<React.SetStateAction<SavedColor[]>>
}

interface Actions {
  handleSave: (color: SavedColor) => void
  handleDelete: (id: string) => void
  handleCopy: (text: string) => void
}

export function useColorActions({ setItems }: Params): Actions {
  function ipcMutate(channel: string, payload: unknown): void {
    window.core.ipc
      .invoke(EXT_ID, channel, payload)
      .then((res) => {
        const r = res as { success: boolean; data?: SavedColor[] } | null
        if (r?.success) setItems(r.data ?? [])
      })
      .catch(() => {})
  }

  const handleSave = (color: SavedColor): void => {
    ipcMutate('saveColor', { color })
  }

  const handleDelete = (id: string): void => {
    ipcMutate('deleteColor', { id })
  }

  const handleCopy = (text: string): void => {
    window.core.ipc.invoke(EXT_ID, 'copyColor', { text }).catch(() => {})
  }

  return { handleSave, handleDelete, handleCopy }
}
