import type { AngrysearchItem, DbStatus } from '../types.ts'

const EXT_ID = 'com.nuxy.angrysearch'

interface Params {
  setStatus: React.Dispatch<React.SetStateAction<DbStatus | null>>
}

interface Actions {
  handleOpen: (item: AngrysearchItem) => void
  handleOpenLocation: (item: AngrysearchItem) => void
  triggerUpdate: () => void
}

export function useAngrysearchActions({ setStatus }: Params): Actions {
  const handleOpen = (item: AngrysearchItem): void => {
    if (!window.core?.ipc?.invoke || !item) return
    window.core.ipc.invoke(EXT_ID, 'openFile', item.value).catch(() => {})
    window.core?.window?.hide?.()
  }

  const handleOpenLocation = (item: AngrysearchItem): void => {
    if (!window.core?.ipc?.invoke || !item) return
    window.core.ipc.invoke(EXT_ID, 'openLocation', item.value).catch(() => {})
    window.core?.window?.hide?.()
  }

  const triggerUpdate = (): void => {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc.invoke(EXT_ID, 'updateDatabase').then(() => {
      setStatus((prev) => (prev ? { ...prev, isUpdating: true } : prev))
    })
  }

  return { handleOpen, handleOpenLocation, triggerUpdate }
}
