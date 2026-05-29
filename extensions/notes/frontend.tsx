const React = window.React
const { useState, useEffect, useRef } = React

import type { Note } from './types.ts'

interface Props {
  query: string
}

interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export default function NotesApp({ query }: Props) {
  const { IconMic, IconStop } = window.UI || {}
  const [notes, setNotes] = useState<Note[]>([])
  const [selected, setSelected] = useState<Note | null>(null)
  const [title, setTitle] = useState<string>('')
  const [body, setBody] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [recording, setRecording] = useState<boolean>(false)
  const [transcribing, setTranscribing] = useState<boolean>(false)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const invoke = <T = unknown>(channel: string, payload?: unknown): Promise<T> =>
    window.core.ipc
      .invoke('com.nuxy.notes', channel, payload)
      .then((res) => {
        const r = res as IpcResponse<T>
        if (!r?.success) throw new Error(r?.error || 'IPC call failed')
        return r.data as T
      })

  useEffect(() => {
    invoke<Note[]>('notes:list', {}).then(setNotes).catch(() => {})
  }, [])

  const filteredNotes = search.trim()
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.body.toLowerCase().includes(search.toLowerCase())
      )
    : notes

  function selectNote(note: Note): void {
    setSelected(note)
    setTitle(note.title)
    setBody(note.body)
  }

  async function handleNew(): Promise<void> {
    const note = await invoke<Note>('notes:create', { title: 'New Note', body: '' })
    const updated = await invoke<Note[]>('notes:list', {})
    setNotes(updated)
    selectNote(note)
  }

  async function handleSave(): Promise<void> {
    if (!selected) return
    const updated = await invoke<Note>('notes:update', { id: selected.id, title, body })
    const list = await invoke<Note[]>('notes:list', {})
    setNotes(list)
    setSelected(updated)
  }

  async function handleDelete(): Promise<void> {
    if (!selected) return
    await invoke('notes:delete', { id: selected.id })
    const list = await invoke<Note[]>('notes:list', {})
    setNotes(list)
    setSelected(null)
    setTitle('')
    setBody('')
  }

  async function handleRecord(): Promise<void> {
    if (recording) return
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
          // silently fail if transcription unavailable
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

  const panelStyle: React.CSSProperties = { display: 'flex', height: '100%', fontFamily: 'inherit' }
  const leftStyle: React.CSSProperties = {
    width: '33%',
    borderRight: '1px solid var(--border-color, #333)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  }
  const rightStyle: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', padding: '8px' }
  const listHeaderStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', padding: '6px 8px', gap: '6px' }
  const searchStyle: React.CSSProperties = {
    flex: 1,
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid var(--border-color, #333)',
    background: 'var(--input-bg, #1a1a1a)',
    color: 'var(--text-color, #fff)',
    fontSize: '13px',
  }
  const newBtnStyle: React.CSSProperties = {
    padding: '4px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    background: 'var(--accent-color, #4a9eff)',
    color: '#fff',
    border: 'none',
    fontSize: '16px',
  }
  const itemStyle = (isSelected: boolean): React.CSSProperties => ({
    padding: '8px 10px',
    cursor: 'pointer',
    borderBottom: '1px solid var(--border-color, #222)',
    background: isSelected ? 'var(--selected-bg, #2a2a3a)' : 'transparent',
  })
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 8px',
    marginBottom: '6px',
    borderRadius: '4px',
    border: '1px solid var(--border-color, #333)',
    background: 'var(--input-bg, #1a1a1a)',
    color: 'var(--text-color, #fff)',
    fontSize: '15px',
    fontWeight: 'bold',
    boxSizing: 'border-box',
  }
  const textareaStyle: React.CSSProperties = {
    flex: 1,
    width: '100%',
    padding: '6px 8px',
    borderRadius: '4px',
    border: '1px solid var(--border-color, #333)',
    background: 'var(--input-bg, #1a1a1a)',
    color: 'var(--text-color, #fff)',
    fontSize: '13px',
    resize: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  }
  const toolbarStyle: React.CSSProperties = { display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }
  const btnStyle = (variant?: string): React.CSSProperties => ({
    padding: '5px 14px',
    borderRadius: '4px',
    cursor: 'pointer',
    border: 'none',
    background:
      variant === 'primary' ? 'var(--accent-color, #4a9eff)' : 'var(--btn-bg, #333)',
    color: '#fff',
    fontSize: '13px',
  })

  return (
    <div style={panelStyle}>
      <div style={leftStyle}>
        <div style={listHeaderStyle}>
          <input
            style={searchStyle}
            placeholder="Search…"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
          <button style={newBtnStyle} onClick={handleNew} title="New note">
            +
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              style={itemStyle(selected?.id === note.id)}
              onClick={() => selectNote(note)}
            >
              <div
                style={{
                  fontWeight: 'bold',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {note.title}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  opacity: 0.6,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {note.body.slice(0, 60)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={rightStyle}>
        {selected ? (
          <>
            <input
              style={inputStyle}
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              placeholder="Title"
            />
            <textarea
              style={textareaStyle}
              value={body}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
              placeholder="Start writing…"
            />
            <div style={toolbarStyle}>
              <button style={btnStyle('primary')} onClick={handleSave}>
                Save
              </button>
              <button style={btnStyle()} onClick={handleDelete}>
                Delete
              </button>
              <div style={{ flex: 1 }} />
              <button
                style={{
                  ...btnStyle(),
                  background: recording ? 'var(--color-danger)' : transcribing ? 'var(--color-warning)' : 'var(--btn-bg, var(--surface-overlay))',
                }}
                onClick={recording ? handleStopRecord : handleRecord}
                disabled={transcribing}
                title={recording ? 'Stop recording' : 'Record voice'}
              >
                {transcribing
                  ? 'Transcribing…'
                  : recording
                    ? (IconStop ? <IconStop style={{ width: '12px', height: '12px' }} /> : 'Stop')
                    : (IconMic ? <IconMic style={{ width: '12px', height: '12px' }} /> : 'Rec')}
              </button>
            </div>
          </>
        ) : (
          <div style={{ opacity: 0.4, margin: 'auto', fontSize: '14px' }}>
            Select a note or create a new one
          </div>
        )}
      </div>
    </div>
  )
}
