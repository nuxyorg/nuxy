const React = window.React

import type { TimerStatus } from '../types.ts'
import { ipc as invoke } from '../utils/ipc.ts'

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
