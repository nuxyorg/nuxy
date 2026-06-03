const React = window.React

import type { Note } from '../types.ts'

const EXT_ID = 'com.nuxy.notes'

interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

function invoke<T = unknown>(channel: string, payload?: unknown): Promise<T> {
  return window.core.ipc.invoke(EXT_ID, channel, payload).then((res) => {
    const r = res as IpcResponse<T>
    if (!r?.success) throw new Error(r?.error || 'IPC call failed')
    return r.data as T
  })
}

interface NotesData {
  notes: Note[]
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>
  fontSize: string
  invoke: <T = unknown>(channel: string, payload?: unknown) => Promise<T>
}

export function useNotesData(): NotesData {
  const [notes, setNotes] = React.useState<Note[]>([])
  const [fontSize, setFontSize] = React.useState<string>('14px')

  React.useEffect(() => {
    invoke<Note[]>('notes:list', {})
      .then(setNotes)
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    invoke<{ fontSize: string }>('notes:getConfig', {})
      .then((cfg) => {
        if (cfg?.fontSize) setFontSize(cfg.fontSize)
      })
      .catch(() => {})
  }, [])

  return { notes, setNotes, fontSize, invoke }
}
