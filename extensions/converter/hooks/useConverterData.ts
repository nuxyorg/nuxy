const React = window.React

import type { ConversionResult } from '../types.ts'

const EXT_ID = 'com.nuxy.converter'

interface ConverterData {
  results: ConversionResult[]
  loading: boolean
}

export function useConverterData(query: string): ConverterData {
  const [results, setResults] = React.useState<ConversionResult[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    const q = query || ''
    if (!q.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    const timer = setTimeout(() => {
      if (!window.core?.ipc?.invoke) {
        setLoading(false)
        return
      }
      window.core.ipc
        .invoke(EXT_ID, 'convert', { query: q })
        .then((res: unknown) => {
          setLoading(false)
          const r = res as { success: boolean; data?: ConversionResult[] } | null
          if (r?.success && Array.isArray(r.data)) {
            setResults(r.data)
          } else {
            setResults([])
          }
        })
        .catch(() => {
          setLoading(false)
          setResults([])
        })
    }, 120)

    return () => clearTimeout(timer)
  }, [query])

  return { results, loading }
}
