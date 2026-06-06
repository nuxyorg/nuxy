const React = window.React
const { useEffect, useState } = React

export function useToolHistory(SHELL_EXT_ID: string): {
  recentToolIds: string[]
  recordToolUsed: (toolId: string) => void
} {
  const [recentToolIds, setRecentToolIds] = useState<string[]>([])

  useEffect(() => {
    window.core?.ipc
      ?.invoke(SHELL_EXT_ID, 'getRecentTools', {})
      .then((res: unknown) => {
        const r = res as { success: boolean; data: string[] } | null
        if (r?.success && Array.isArray(r.data)) setRecentToolIds(r.data)
      })
      .catch(() => {})
  }, [])

  function recordToolUsed(toolId: string): void {
    window.core?.ipc
      ?.invoke(SHELL_EXT_ID, 'recordToolUsed', toolId)
      .then((res: unknown) => {
        const r = res as { success: boolean; data: string[] } | null
        if (r?.success && Array.isArray(r.data)) setRecentToolIds(r.data)
      })
      .catch(() => {})
  }

  return { recentToolIds, recordToolUsed }
}
