const React = window.React

import type { ProcessInfo } from '../types.ts'

const EXT_ID = 'com.nuxy.prockill'
const KILL_ERROR_RESET_MS = 3000

interface Params {
  loadProcesses: () => void
  killFailedMessage: string
}

interface ProcessActions {
  killError: string | null
  handleKill: (proc: ProcessInfo, signal: 'SIGTERM' | 'SIGKILL') => void
}

export function useProcessActions({ loadProcesses, killFailedMessage }: Params): ProcessActions {
  const [killError, setKillError] = React.useState<string | null>(null)

  const handleKill = React.useCallback(
    (proc: ProcessInfo, signal: 'SIGTERM' | 'SIGKILL'): void => {
      if (!window.core?.ipc?.invoke) return
      window.core.ipc
        .invoke(EXT_ID, 'killProcess', { pid: proc.pid, signal })
        .then((res) => {
          const r = res as { success: boolean; data?: { success: boolean; error?: string } } | null
          if (r?.success && r?.data?.success) {
            loadProcesses()
          } else {
            const errorMsg = r?.data?.error || killFailedMessage
            setKillError(errorMsg)
            setTimeout(() => setKillError(null), KILL_ERROR_RESET_MS)
          }
        })
        .catch(() => {
          setKillError(killFailedMessage)
          setTimeout(() => setKillError(null), KILL_ERROR_RESET_MS)
        })
    },
    [loadProcesses, killFailedMessage]
  )

  return { killError, handleKill }
}
