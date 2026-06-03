const React = window.React

import type { Reminder } from '../types.ts'

const EXT_ID = 'com.nuxy.remind'

function invoke<T = unknown>(channel: string, payload?: unknown): Promise<T> {
  return window.core.ipc.invoke(EXT_ID, channel, payload).then((res) => {
    const r = res as { success: boolean; data?: T; error?: string } | null
    if (!r?.success) throw new Error(r?.error ?? 'IPC call failed')
    return r.data as T
  })
}

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

export function useRemindActions({ query, selectedIndex, reminders, refreshReminders }: Params): RemindActions {
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
    [refreshReminders],
  )

  return { handleCreate, handleCancel }
}
