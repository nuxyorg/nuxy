const React = window.React

import type { NyaaResult } from '../types.ts'

const EXT_ID = 'com.nuxy.nyaa'

interface SearchState {
  results: NyaaResult[]
  loading: boolean
  error: string | null
}

export function useNyaaSearch(query: string): SearchState {
  const [results, setResults] = React.useState<NyaaResult[]>([])
  const [loading, setLoading] = React.useState<boolean>(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setError(null)

    const dispatchPortal = (node: unknown) =>
      window.dispatchEvent(new CustomEvent('nuxy-omnibar-portal', { detail: node }))

    setLoading(true)
    const Spinner = (window.UI as any)?.Spinner
    dispatchPortal(Spinner ? React.createElement(Spinner, { size: 'sm' }) : null)

    const timer = setTimeout(() => {
      if (cancelled) return
      window.core.ipc
        .invoke(EXT_ID, 'search', { query })
        .then((res) => {
          if (cancelled) return
          const r = res as { success: boolean; data?: NyaaResult[]; error?: string } | null
          if (r?.success) {
            setResults(r.data ?? [])
          } else {
            setError(r?.error ?? 'Search failed')
            setResults([])
          }
        })
        .catch((err: Error) => {
          if (cancelled) return
          setError(err?.message ?? 'Search failed')
          setResults([])
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false)
            dispatchPortal(null)
          }
        })
    }, 1000)

    return () => {
      cancelled = true
      clearTimeout(timer)
      dispatchPortal(null)
    }
  }, [query])

  return { results, loading, error }
}
