const React = window.React

import type { ConvertResponse } from '../types.ts'

const EXT_ID = 'com.nuxy.time-calculator'

export interface TimeCalculatorData {
  result: ConvertResponse | null
  loading: boolean
  fromAI: boolean
}

export function useTimeCalculatorData(query: string): TimeCalculatorData {
  const [result, setResult] = React.useState<ConvertResponse | null>(null)
  const [loading, setLoading] = React.useState<boolean>(false)
  const [fromAI, setFromAI] = React.useState<boolean>(false)

  // Inline reset: when query changes, sync derived state during render
  const [prevQuery, setPrevQuery] = React.useState(query)
  if (query !== prevQuery) {
    setPrevQuery(query)
    const currentQuery = query || ''
    if (!currentQuery.trim()) {
      if (!fromAI) setResult(null)
    } else {
      setFromAI(false)
      setLoading(true)
    }
  }

  // On mount: check if there's a last result from the AI orchestrator
  React.useEffect(() => {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'getLastResult')
      .then((res: unknown) => {
        const r = res as { success: boolean; data: ConvertResponse } | null
        if (r?.success && r.data?.meta) {
          setResult(r.data)
          setFromAI(true)
        }
      })
      .catch(() => {})
  }, [])

  // Live eval when user types in omnibar
  React.useEffect(() => {
    const currentQuery = query || ''
    if (!currentQuery.trim()) return

    const timer = setTimeout(() => {
      if (!window.core?.ipc?.invoke) {
        setLoading(false)
        return
      }
      window.core.ipc
        .invoke(EXT_ID, 'eval', { text: currentQuery })
        .then((res: unknown) => {
          setLoading(false)
          const r = res as { success: boolean; data: { items: ConvertResponse[] } } | null
          if (r?.success && r.data?.items?.length > 0) {
            setResult(r.data.items[0])
          } else {
            setResult(null)
          }
        })
        .catch(() => {
          setLoading(false)
          setResult(null)
        })
    }, 80)

    return () => clearTimeout(timer)
  }, [query])

  return { result, loading, fromAI }
}
