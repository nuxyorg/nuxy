const React = window.React
const { useState, useEffect, useRef, useMemo } = React

import type { Note } from './types.ts'

const EXT_ID = 'com.nuxy.notes'

const _useListNavigation =
  (window.UI || {}).useListNavigation ||
  (() => ({ selectedIndex: -1, setSelectedIndex: () => {}, selectedItem: null }))
const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

interface Props {
  query: string
}

interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
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
    Button,
    Input,
    Textarea,
    SectionHeader,
    IconMic,
    IconStop,
  } = window.UI || {}

  const [notes, setNotes] = useState<Note[]>([])
  const [selected, setSelected] = useState<Note | null>(null)
  const [title, setTitle] = useState<string>('')
  const [body, setBody] = useState<string>('')
  const [recording, setRecording] = useState<boolean>(false)
  const [transcribing, setTranscribing] = useState<boolean>(false)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const invoke = <T = unknown,>(channel: string, payload?: unknown): Promise<T> =>
    window.core.ipc.invoke(EXT_ID, channel, payload).then((res) => {
      const r = res as IpcResponse<T>
      if (!r?.success) throw new Error(r?.error || 'IPC call failed')
      return r.data as T
    })

  useEffect(() => {
    invoke<Note[]>('notes:list', {})
      .then(setNotes)
      .catch(() => {})
  }, [])

  const filteredNotes = useMemo(() => {
    if (!query.trim()) return notes
    const q = query.toLowerCase()
    return notes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
    )
  }, [notes, query])

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
    setSelected(updated)
    const list = await invoke<Note[]>('notes:list', {})
    setNotes(list)
  }

  async function handleDelete(): Promise<void> {
    if (!selected) return
    await invoke('notes:delete', { id: selected.id })
    setSelected(null)
    setTitle('')
    setBody('')
    const list = await invoke<Note[]>('notes:list', {})
    setNotes(list)
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

  const { selectedIndex } = _useListNavigation(filteredNotes, {
    onEnter: (note: Note) => selectNote(note),
    enterLabel: 'Open',
    enterHint: 'Enter',
  })

  _useToolKeyActions([
    {
      key: 'n',
      label: 'New note',
      hint: 'N',
      handler: () => {
        void handleNew()
      },
    },
    {
      key: 's',
      label: 'Save',
      hint: 'S',
      activeOn: () => selected !== null,
      handler: () => {
        void handleSave()
      },
    },
    {
      key: 'Delete',
      label: 'Delete',
      hint: 'Del',
      activeOn: () => selected !== null,
      handler: () => {
        void handleDelete()
      },
    },
  ])

  const leftPanel = (
    <>
      {SectionHeader && (
        <SectionHeader
          title="Notes"
          action={
            Button ? (
              <Button
                onClick={() => {
                  void handleNew()
                }}
              >
                +
              </Button>
            ) : undefined
          }
        />
      )}
      <List>
        {filteredNotes.length === 0 ? (
          <EmptyState
            message={query ? 'No matching notes.' : 'No notes yet.'}
            hint="Press N to create one."
          />
        ) : (
          filteredNotes.map((note, idx) => (
            <ListItem key={note.id} active={idx === selectedIndex} onClick={() => selectNote(note)}>
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

  const rightPanel = selected ? (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: 'var(--space-2)',
        gap: 'var(--space-2)',
      }}
    >
      {Input && (
        <Input
          value={title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
          placeholder="Title"
        />
      )}
      {Textarea && (
        <Textarea
          value={body}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
          placeholder="Start writing…"
          style={{
            flex: 1,
            resize: 'none',
          }}
        />
      )}
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        {Button && (
          <Button
            onClick={() => {
              void handleSave()
            }}
          >
            Save
          </Button>
        )}
        {Button && (
          <Button
            onClick={() => {
              void handleDelete()
            }}
          >
            Delete
          </Button>
        )}
        <div style={{ flex: 1 }} />
        {Button && (
          <Button
            onClick={
              recording
                ? handleStopRecord
                : () => {
                    void handleRecord()
                  }
            }
            disabled={transcribing}
          >
            {transcribing ? (
              'Transcribing…'
            ) : recording ? (
              IconStop ? (
                <IconStop style={{ width: '12px', height: '12px' }} />
              ) : (
                'Stop'
              )
            ) : IconMic ? (
              <IconMic style={{ width: '12px', height: '12px' }} />
            ) : (
              'Rec'
            )}
          </Button>
        )}
      </div>
    </div>
  ) : (
    <EmptyState message="Select a note or create a new one." hint="Press N to create." />
  )

  if (TwoPanel) {
    return <TwoPanel left={leftPanel} right={rightPanel} />
  }

  return leftPanel
}
