const React = window.React

const EXT_ID = 'com.nuxy.nyaa'

export type EnterAction = 'copyMagnet' | 'downloadTorrent'

interface Actions {
  copiedId: string | null
  enterAction: EnterAction
  handleCopyMagnet: (id: string, magnet: string) => void
  handleDownloadTorrent: (id: string) => void
  handleCopyMagnets: (items: Array<{ id: string; magnet: string }>) => void
  handleDownloadTorrents: (ids: string[]) => void
}

export function useNyaaActions(): Actions {
  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  const [enterAction, setEnterAction] = React.useState<EnterAction>('copyMagnet')

  // Read enterAction setting once on mount
  React.useEffect(() => {
    window.core.ipc
      .invoke(EXT_ID, 'getEnterAction', {})
      .then((res: unknown) => {
        const r = res as { success: boolean; data?: string } | null
        if (r?.success && (r.data === 'copyMagnet' || r.data === 'downloadTorrent')) {
          setEnterAction(r.data)
        }
      })
      .catch(() => {})
  }, [])

  const handleCopyMagnet = (id: string, magnet: string): void => {
    window.core.ipc
      .invoke(EXT_ID, 'copyMagnet', { magnet })
      .then(() => {
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
        setTimeout(() => window.core?.window?.hide?.(), 150)
      })
      .catch(() => {})
  }

  const handleDownloadTorrent = (id: string): void => {
    window.core.ipc
      .invoke(EXT_ID, 'downloadTorrent', { id })
      .then(() => {
        setTimeout(() => window.core?.window?.hide?.(), 150)
      })
      .catch(() => {})
  }

  const handleCopyMagnets = (items: Array<{ id: string; magnet: string }>): void => {
    const magnets = items.map((i) => i.magnet)
    window.core.ipc
      .invoke(EXT_ID, 'copyMagnets', { magnets })
      .then(() => {
        setTimeout(() => window.core?.window?.hide?.(), 150)
      })
      .catch(() => {})
  }

  const handleDownloadTorrents = (ids: string[]): void => {
    window.core.ipc
      .invoke(EXT_ID, 'downloadTorrents', { ids })
      .then(() => {
        setTimeout(() => window.core?.window?.hide?.(), 300)
      })
      .catch(() => {})
  }

  return {
    copiedId,
    enterAction,
    handleCopyMagnet,
    handleDownloadTorrent,
    handleCopyMagnets,
    handleDownloadTorrents,
  }
}
