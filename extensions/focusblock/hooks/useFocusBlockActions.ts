const React = window.React

import type { TimerStatus } from '../types.ts'

const EXT_ID = 'com.nuxy.focusblock'

interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  return window.core.ipc.invoke(EXT_ID, channel, payload).then((res) => {
    const r = res as IpcResponse<T>
    if (!r?.success) throw new Error(r?.error || 'IPC failed')
    return r.data as T
  })
}

interface Params {
  duration: number
  label: string
  refreshStatus: () => void
  refreshHistory: () => void
  setStatus: React.Dispatch<React.SetStateAction<TimerStatus | null>>
}

interface FocusBlockActions {
  handleStart: () => void
  handleStop: () => void
}

export function useFocusBlockActions({
  duration,
  label,
  refreshStatus,
  refreshHistory,
  setStatus,
}: Params): FocusBlockActions {
  const handleStart = React.useCallback(() => {
    invoke<TimerStatus>('focusblock:start', { duration, label })
      .then((s) => setStatus(s))
      .catch(() => {})
  }, [duration, label])

  const handleStop = React.useCallback(() => {
    invoke('focusblock:stop')
      .then(() => {
        refreshStatus()
        refreshHistory()
      })
      .catch(() => {})
  }, [])

  return { handleStart, handleStop }
}
