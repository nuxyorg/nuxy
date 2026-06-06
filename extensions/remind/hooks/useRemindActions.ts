const React = window.React

import type { Reminder } from '../types.ts'
import { ipc as invoke } from '../utils/ipc.ts'

interface Params {
  query: string
  selectedIndex: number
  reminders: Reminder[]
  refreshReminders: () => void
}

interface RemindActions {
  handleCreate: () => void
  handleCancel: (id: string) => void
}

export function useRemindActions({
  query,
  selectedIndex,
  reminders,
  refreshReminders,
}: Params): RemindActions {
  const handleCreate = React.useCallback(() => {
    if (!query.trim()) return
    invoke<Reminder>('remind:create', { text: query })
      .then(() => refreshReminders())
      .catch(() => {})
  }, [query, refreshReminders])

  const handleCancel = React.useCallback(
    (id: string) => {
      invoke('remind:cancel', { id })
        .then(() => refreshReminders())
        .catch(() => {})
    },
    [refreshReminders]
  )

  return { handleCreate, handleCancel }
}
