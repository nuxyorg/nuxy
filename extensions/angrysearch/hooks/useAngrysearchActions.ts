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
  const openAndHide = (channel: string, value: string): void => {
    window.core.ipc.invoke(EXT_ID, channel, value).catch(() => {})
    window.core?.window?.hide?.()
  }

  const handleOpen = (item: AngrysearchItem): void => {
    if (!window.core?.ipc?.invoke || !item) return
    openAndHide('openFile', item.value)
  }

  const handleOpenLocation = (item: AngrysearchItem): void => {
    if (!window.core?.ipc?.invoke || !item) return
    openAndHide('openLocation', item.value)
  }

  const triggerUpdate = (): void => {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc.invoke(EXT_ID, 'updateDatabase').then(() => {
      setStatus((prev) => (prev ? { ...prev, isUpdating: true } : prev))
    })
  }

  return { handleOpen, handleOpenLocation, triggerUpdate }
}
