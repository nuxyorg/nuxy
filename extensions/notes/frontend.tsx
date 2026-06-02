const React = window.React
const { useState, useEffect, useRef, useMemo, Component } = React

import type { Note } from './types.ts'

const EXT_ID = 'com.nuxy.notes'

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: any) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '16px', color: 'var(--text-muted, #888)', fontSize: '13px' }}>
          <div style={{ marginBottom: '4px', color: 'var(--error, #f87171)', fontWeight: 500 }}>Render error</div>
          <div style={{ opacity: 0.7 }}>{this.state.error.message}</div>
        </div>
      )
    }
    return this.props.children
  }
}

const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

interface Props {
  query: string
}

interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

function deriveTitle(body: string): string {
  const lines = body.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return 'New Note'
  const firstLine = lines[0]
  if (firstLine.length > 40) {
    return firstLine.slice(0, 40) + '...'
  }
  return firstLine
}

export default function NotesApp({ query }: Props) {
  const {
    TwoPanel,
    List,
    ListItem,
    ListItemBody,
    ListItemText,
    ListItemMeta,
    EmptyState,
    Textarea,
    SectionHeader,
    MarkdownText,
    toast,
  } = window.UI || {}

  const [notes, setNotes] = useState<Note[]>([])
  const [selected, setSelected] = useState<Note | null>(null)
  const [body, setBody] = useState<string>('')
  const [editMode, setEditMode] = useState<boolean>(false)
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)

  const [recording, setRecording] = useState<boolean>(false)
  const [transcribing, setTranscribing] = useState<boolean>(false)
  const [fontSize, setFontSize] = useState<string>('14px')
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const invoke = <T = unknown,>(channel: string, payload?: unknown): Promise<T> =>
    window.core.ipc.invoke(EXT_ID, channel, payload).then((res) => {
      const r = res as IpcResponse<T>
      if (!r?.success) throw new Error(r?.error || 'IPC call failed')
      return r.data as T
    })

  // Filter notes based on query
  const filteredNotes = useMemo(() => {
    if (!query.trim() || query.startsWith('select:')) return notes
    const q = query.toLowerCase()
    return notes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
    )
  }, [notes, query])

  // Load notes on mount
  useEffect(() => {
    invoke<Note[]>('notes:list', {})
      .then(setNotes)
      .catch(() => {})
  }, [])

  // Fetch settings config
  useEffect(() => {
    invoke<{ fontSize: string }>('notes:getConfig', {})
      .then((cfg) => {
        if (cfg?.fontSize) setFontSize(cfg.fontSize)
      })
      .catch(() => {})
  }, [])

  // Handle select: query from search provider click
  useEffect(() => {
    if (query && query.startsWith('select:')) {
      const noteId = query.substring('select:'.length)
      const note = notes.find((n) => n.id === noteId)
      if (note) {
        setSelected(note)
        setBody(note.body)
        const idx = filteredNotes.findIndex((n) => n.id === noteId)
        if (idx !== -1) {
          setSelectedIndex(idx + 1)
        }
        setEditMode(false) // Start in preview mode
        // Clear omnibar query
        window.dispatchEvent(
          new CustomEvent('nuxy-shell-omni-bar-control', { detail: { action: 'clear' } })
        )
      }
    }
  }, [query, notes, filteredNotes])

  // Reset selectedIndex when query changes (only when it is an actual search query)
  useEffect(() => {
    if (query && !query.startsWith('select:')) {
      setSelectedIndex(-1)
    }
  }, [query])

  // Sync selected note when selectedIndex changes
  useEffect(() => {
    if (editMode) return // Don't interrupt edit mode changes
    if (selectedIndex > 0 && selectedIndex <= filteredNotes.length) {
      const note = filteredNotes[selectedIndex - 1]
      if (note) {
        setSelected(note)
        setBody(note.body)
      }
    } else {
      setSelected(null)
      setBody('')
    }
  }, [selectedIndex, filteredNotes, editMode])

  // Focus textarea when editMode changes
  useEffect(() => {
    if (editMode && textareaRef.current) {
      textareaRef.current.focus()
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [editMode])

  async function handleNew(): Promise<void> {
    const note = await invoke<Note>('notes:create', { title: 'New Note', body: '' })
    const updated = await invoke<Note[]>('notes:list', {})
    setNotes(updated)
    setSelected(note)
    setBody('')
    setSelectedIndex(1) // index 0 is "New Note", index 1 is this new note
    setEditMode(true)
  }

  async function handleSave(): Promise<void> {
    if (!selected) return
    const title = deriveTitle(body)
    const updated = await invoke<Note>('notes:update', { id: selected.id, title, body })
    setSelected(updated)
    const list = await invoke<Note[]>('notes:list', {})

    // Find the new index of the updated note in the filtered notes list
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

  // Register keyboard actions via useToolKeyActions
  const keyActions = useMemo(() => [
    {
      key: 'n',
      modifiers: ['ctrl'] as const,
      label: 'New Note',
      hint: '⌃N',
      handler: () => {
        void handleNew()
      },
    },
    {
      key: 's',
      modifiers: ['ctrl'] as const,
      label: 'Save Note',
      hint: '⌃S',
      activeOn: () => editMode && selected !== null,
      handler: () => {
        void handleSave()
      },
    },
    {
      key: 'Delete',
      label: 'Delete Note',
      hint: 'Del',
      activeOn: () => !editMode && selectedIndex > 0 && selectedIndex <= filteredNotes.length,
      handler: () => {
        void handleDelete()
      },
    },
    {
      key: 'Enter',
      label: 'Edit Note',
      hint: '↵',
      activeOn: () => !editMode && selectedIndex >= 0 && selectedIndex <= filteredNotes.length,
      handler: () => {
        if (selectedIndex === 0) {
          void handleNew()
        } else {
          const note = filteredNotes[selectedIndex - 1]
          if (note) {
            setSelected(note)
            setBody(note.body)
            setEditMode(true)
          }
        }
      },
    },
    {
      key: 'Escape',
      label: 'Focus search / Exit edit',
      hint: 'Esc',
      handler: () => {
        if (editMode) {
          setEditMode(false)
        } else {
          window.dispatchEvent(
            new CustomEvent('nuxy-shell-omni-bar-control', { detail: { action: 'show' } })
          )
          setSelectedIndex(-1)
        }
      },
    },
    {
      key: 'ArrowUp',
      label: 'Previous',
      allowRepeat: true,
      activeOn: () => !editMode,
      handler: () => {
        setSelectedIndex((prev) => {
          if (prev <= 0) {
            window.dispatchEvent(
              new CustomEvent('nuxy-shell-omni-bar-control', { detail: { action: 'show' } })
            )
            return -1
          }
          return prev - 1
        })
      },
    },
    {
      key: 'ArrowDown',
      label: 'Next',
      allowRepeat: true,
      activeOn: () => !editMode,
      handler: () => {
        setSelectedIndex((prev) => {
          const maxIdx = filteredNotes.length
          if (prev < maxIdx) {
            if (prev === -1) {
              window.dispatchEvent(
                new CustomEvent('nuxy-shell-omni-bar-control', { detail: { action: 'hide' } })
              )
            }
            return prev + 1
          }
          return prev
        })
      },
    },
  ], [editMode, selectedIndex, filteredNotes, selected, body])

  _useToolKeyActions(keyActions)

  // Register command palette actions
  useEffect(() => {
    const actions = [
      {
        id: 'notes-new',
        label: 'New note',
        onExecute: () => {
          void handleNew()
        },
      },
    ]
    if (selected !== null) {
      actions.push(
        {
          id: 'notes-save',
          label: 'Save',
          onExecute: () => {
            void handleSave()
          },
        },
        {
          id: 'notes-delete',
          label: 'Delete',
          onExecute: () => {
            void handleDelete()
          },
        },
        {
          id: 'notes-record',
          label: recording ? 'Stop recording' : 'Record',
          onExecute: () => {
            if (recording) handleStopRecord()
            else void handleRecord()
          },
        }
      )
    }
    window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: actions }))
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: [] }))
    }
  }, [selected, recording, editMode])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [selected, recording, editMode, selectedIndex])

  const leftPanel = (
    <>
      {SectionHeader && <SectionHeader label="Notes" />}
      <List>
        <ListItem active={selectedIndex === 0} onClick={() => setSelectedIndex(0)}>
          <ListItemBody>
            <ListItemText>New Note</ListItemText>
            <ListItemMeta>Create a new note</ListItemMeta>
          </ListItemBody>
        </ListItem>
        {filteredNotes.length === 0 ? (
          <EmptyState
            message={query ? 'No matching notes.' : 'No notes yet.'}
            hint="Use ⌃N to create a new note."
          />
        ) : (
          filteredNotes.map((note, idx) => (
            <ListItem
              key={note.id}
              active={idx + 1 === selectedIndex}
              onClick={() => setSelectedIndex(idx + 1)}
            >
              <ListItemBody>
                <ListItemText>{note.title}</ListItemText>
                <ListItemMeta>{note.body.slice(0, 60)}</ListItemMeta>
              </ListItemBody>
            </ListItem>
          ))
        )}
      </List>
    </>
  )

  const Editor = Textarea || 'textarea'

  const rightPanel = editMode && selected ? (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: 'var(--space-2)',
        gap: 'var(--space-2)',
      }}
    >
      <Editor
        ref={textareaRef}
        className="nuxy-textarea"
        value={body}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
        placeholder={transcribing ? 'Transcribing…' : 'Start writing…'}
        style={{
          flex: 1,
          resize: 'none',
          width: '100%',
          height: '100%',
          border: 'none',
          background: 'transparent',
          color: 'var(--text, #ffffff)',
          outline: 'none',
          padding: 'var(--space-4, 12px)',
          fontSize,
        }}
      />
    </div>
  ) : selected ? (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: 'var(--space-4, 12px)',
        overflowY: 'auto',
        color: 'var(--text, #ffffff)',
        gap: 'var(--space-2)',
      }}
    >
      <div style={{ fontSize: '1.2em', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
        {selected.title}
      </div>
      <div style={{ flex: 1, whiteSpace: 'pre-wrap', opacity: 0.8, fontSize: fontSize, lineHeight: '1.5' }}>
        {MarkdownText ? <ErrorBoundary><MarkdownText>{selected.body}</MarkdownText></ErrorBoundary> : selected.body}
      </div>
    </div>
  ) : (
    <EmptyState
      message="Select a note or create a new one."
      hint="Use ⌃N to create a new note."
    />
  )

  return (
    <div className={`nuxy-notes-app ${editMode ? 'nuxy-notes-edit-mode' : ''}`} style={{ height: '100%' }}>
      <style>{`
        .nuxy-notes-edit-mode .nuxy-two-panel__left {
          display: none !important;
        }
      `}</style>
      {TwoPanel ? (
        <TwoPanel left={leftPanel} right={rightPanel} />
      ) : (
        leftPanel
      )}
    </div>
  )
}
