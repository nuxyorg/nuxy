const React = window.React

import type { TimerStatus, Session } from '../types.ts'
import { ipc as invoke } from '../utils/ipc.ts'

interface FocusBlockData {
  status: TimerStatus | null
  setStatus: React.Dispatch<React.SetStateAction<TimerStatus | null>>
  sessions: Session[]
  defaultDuration: number
  refreshStatus: () => void
  refreshHistory: () => void
}

export function useFocusBlockData(): FocusBlockData {
  const [status, setStatus] = React.useState<TimerStatus | null>(null)
  const [sessions, setSessions] = React.useState<Session[]>([])
  const [defaultDuration, setDefaultDuration] = React.useState(25)

  const active = status?.active ?? false

  const refreshStatus = React.useCallback(() => {
    invoke<TimerStatus>('focusblock:status')
      .then(setStatus)
      .catch(() => {})
  }, [])

  const refreshHistory = React.useCallback(() => {
    invoke<Session[]>('focusblock:history')
      .then(setSessions)
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    refreshStatus()
    refreshHistory()
    invoke<{ defaultDuration: number }>('focusblock:getSettings')
      .then((s) => setDefaultDuration(s.defaultDuration))
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    if (!active) return
    const id = setInterval(refreshStatus, 1000)
    return () => clearInterval(id)
  }, [active])

  React.useEffect(() => {
    if (status && !status.active) {
      refreshHistory()
    }
  }, [status?.active])

  return { status, setStatus, sessions, defaultDuration, refreshStatus, refreshHistory }
}
