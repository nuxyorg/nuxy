const React = window.React

import type { Reminder, ParsedReminder } from '../types.ts'

const EXT_ID = 'com.nuxy.remind'

function invoke<T = unknown>(channel: string, payload?: unknown): Promise<T> {
  return window.core.ipc.invoke(EXT_ID, channel, payload).then((res) => {
    const r = res as { success: boolean; data?: T; error?: string } | null
    if (!r?.success) throw new Error(r?.error ?? 'IPC call failed')
    return r.data as T
  })
}

interface RemindData {
  reminders: Reminder[]
  preview: ParsedReminder | null
  refreshReminders: () => void
}

export function useRemindData(query: string): RemindData {
  const [reminders, setReminders] = React.useState<Reminder[]>([])
  const [preview, setPreview] = React.useState<ParsedReminder | null>(null)

  const refreshReminders = React.useCallback(() => {
    invoke<Reminder[]>('remind:list')
      .then(setReminders)
      .catch(() => {})
  }, [])

  // Load reminders on mount
  React.useEffect(() => {
    refreshReminders()
  }, [])

  // Refresh list on a 10-second interval so "time remaining" stays roughly fresh
  React.useEffect(() => {
    const id = setInterval(refreshReminders, 10_000)
    return () => clearInterval(id)
  }, [])

  // Parse the query whenever it changes
  React.useEffect(() => {
    if (!query.trim()) {
      setPreview(null)
      return
    }
    invoke<ParsedReminder | null>('remind:parse', { text: query })
      .then(setPreview)
      .catch(() => setPreview(null))
  }, [query])

  return { reminders, preview, refreshReminders }
}
