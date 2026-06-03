const React = window.React

const EXT_ID = 'com.nuxy.nyaa'

interface Actions {
  copiedId: string | null
  handleCopyMagnet: (id: string, magnet: string) => void
}

export function useNyaaActions(): Actions {
  const [copiedId, setCopiedId] = React.useState<string | null>(null)

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

  return { copiedId, handleCopyMagnet }
}
