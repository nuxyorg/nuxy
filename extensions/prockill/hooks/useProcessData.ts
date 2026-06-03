const React = window.React

import type { ProcessInfo } from '../types.ts'

const EXT_ID = 'com.nuxy.prockill'

interface ProcessData {
  processes: ProcessInfo[]
  loadProcesses: () => void
}

export function useProcessData(query: string): ProcessData {
  const [processes, setProcesses] = React.useState<ProcessInfo[]>([])

  const loadProcesses = React.useCallback((): void => {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'listProcesses', { query })
      .then((res) => {
        const r = res as { success: boolean; data?: ProcessInfo[] } | null
        if (r?.success) {
          setProcesses(r.data || [])
        }
      })
      .catch(() => {})
  }, [query])

  // Load on mount with initial query
  React.useEffect(() => {
    loadProcesses()
  }, [])

  // Debounce reload when query changes (300ms — ps aux is expensive)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadProcesses()
    }, 300)
    return () => clearTimeout(timer)
  }, [query, loadProcesses])

  return { processes, loadProcesses }
}
