const React = window.React

const EXT_ID = 'com.nuxy.qr'
const DEBOUNCE_MS = 300

interface QrDataResult {
  dataUrl: string | null
  loading: boolean
  error: string | null
}

export function useQrData(query: string): QrDataResult {
  const [dataUrl, setDataUrl] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState<boolean>(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!query.trim()) {
      setDataUrl(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    const timer = setTimeout(() => {
      window.core.ipc
        .invoke(EXT_ID, 'qr:generate', { text: query })
        .then((res) => {
          const r = res as { success: boolean; data?: { dataUrl: string }; error?: string } | null
          if (r?.success && r.data) {
            setDataUrl(r.data.dataUrl)
            setError(null)
          } else {
            setError(r?.error ?? 'Failed to generate QR code')
            setDataUrl(null)
          }
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to generate QR code')
          setDataUrl(null)
        })
        .finally(() => {
          setLoading(false)
        })
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query])

  return { dataUrl, loading, error }
}
