const React = window.React

import type { Note } from '../types.ts'
import { deriveTitle } from '../utils/noteTitle.ts'

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

interface Params {
  selected: Note | null
  body: string
  query: string
  filteredNotes: Note[]
  selectedIndex: number
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>
  setSelected: React.Dispatch<React.SetStateAction<Note | null>>
  setBody: React.Dispatch<React.SetStateAction<string>>
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
  setEditMode: React.Dispatch<React.SetStateAction<boolean>>
}

interface Actions {
  recording: boolean
  transcribing: boolean
  handleNew: () => Promise<void>
  handleSave: () => Promise<void>
  handleDelete: () => Promise<void>
  handleRecord: () => Promise<void>
  handleStopRecord: () => void
}

export function useNotesActions({
  selected,
  body,
  query,
  filteredNotes,
  selectedIndex,
  setNotes,
  setSelected,
  setBody,
  setSelectedIndex,
  setEditMode,
}: Params): Actions {
  const [recording, setRecording] = React.useState<boolean>(false)
  const [transcribing, setTranscribing] = React.useState<boolean>(false)
  const mediaRef = React.useRef<MediaRecorder | null>(null)
  const chunksRef = React.useRef<Blob[]>([])

  const { toast } = window.UI || {}

  async function handleNew(): Promise<void> {
    const note = await invoke<Note>('notes:create', { title: 'New Note', body: '' })
    const updated = await invoke<Note[]>('notes:list', {})
    setNotes(updated)
    setSelected(note)
    setBody('')
    setSelectedIndex(1)
    setEditMode(true)
  }

  async function handleSave(): Promise<void> {
    if (!selected) return
    const title = deriveTitle(body)
    const updated = await invoke<Note>('notes:update', { id: selected.id, title, body })
    setSelected(updated)
    const list = await invoke<Note[]>('notes:list', {})

    let newFiltered = list
    if (query && !query.startsWith('select:')) {
      const q = query.trim().toLowerCase()
      if (q) {
        newFiltered = list.filter(
          (n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
        )
      }
    }
    const newIdx = newFiltered.findIndex((n) => n.id === updated.id)
    if (newIdx !== -1) {
      setSelectedIndex(newIdx + 1)
    }

    setNotes(list)
    if (toast) toast('Note saved!', { type: 'success' })
  }

  async function handleDelete(): Promise<void> {
    const noteToDelete = selectedIndex > 0 ? filteredNotes[selectedIndex - 1] : selected
    if (!noteToDelete) return
    await invoke('notes:delete', { id: noteToDelete.id })
    setSelected(null)
    setBody('')
    setSelectedIndex(0)
    setEditMode(false)
    const list = await invoke<Note[]>('notes:list', {})
    setNotes(list)
    if (toast) toast('Note deleted', { type: 'info' })
  }

  async function handleRecord(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e: BlobEvent) => chunksRef.current.push(e.data)
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        setRecording(false)
        setTranscribing(true)
        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
          const arrayBuffer = await blob.arrayBuffer()
          const audioBuffer = Array.from(new Uint8Array(arrayBuffer))
          const result = await invoke<{ transcript: string }>('notes:transcribe', { audioBuffer })
          setBody((prev: string) => prev + (prev ? ' ' : '') + result.transcript)
        } catch {
          // silently fail
        } finally {
          setTranscribing(false)
        }
      }
      mediaRef.current = recorder
      recorder.start()
      setRecording(true)
      setTimeout(() => recorder.state === 'recording' && recorder.stop(), 10000)
    } catch {
      setRecording(false)
    }
  }

  function handleStopRecord(): void {
    if (mediaRef.current && mediaRef.current.state === 'recording') {
      mediaRef.current.stop()
    }
  }

  return { recording, transcribing, handleNew, handleSave, handleDelete, handleRecord, handleStopRecord }
}
