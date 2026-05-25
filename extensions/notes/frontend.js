const { useState, useEffect, useRef } = window.React
const h = window.React.createElement

export default function NotesApp() {
  const [notes, setNotes] = useState([])
  const [selected, setSelected] = useState(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [search, setSearch] = useState('')
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const mediaRef = useRef(null)
  const chunksRef = useRef([])

  const invoke = (channel, payload) =>
    window.core.ipc.invoke('com.nuxy.notes', channel, payload)

  useEffect(() => {
    invoke('notes:list', {}).then(setNotes).catch(() => {})
  }, [])

  const filteredNotes = search.trim()
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.body.toLowerCase().includes(search.toLowerCase())
      )
    : notes

  function selectNote(note) {
    setSelected(note)
    setTitle(note.title)
    setBody(note.body)
  }

  async function handleNew() {
    const note = await invoke('notes:create', { title: 'New Note', body: '' })
    const updated = await invoke('notes:list', {})
    setNotes(updated)
    selectNote(note)
  }

  async function handleSave() {
    if (!selected) return
    const updated = await invoke('notes:update', { id: selected.id, title, body })
    const list = await invoke('notes:list', {})
    setNotes(list)
    setSelected(updated)
  }

  async function handleDelete() {
    if (!selected) return
    await invoke('notes:delete', { id: selected.id })
    const list = await invoke('notes:list', {})
    setNotes(list)
    setSelected(null)
    setTitle('')
    setBody('')
  }

  async function handleRecord() {
    if (recording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        setRecording(false)
        setTranscribing(true)
        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
          const arrayBuffer = await blob.arrayBuffer()
          const audioBuffer = Array.from(new Uint8Array(arrayBuffer))
          const { transcript } = await invoke('notes:transcribe', { audioBuffer })
          setBody((prev) => prev + (prev ? ' ' : '') + transcript)
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

  function handleStopRecord() {
    if (mediaRef.current && mediaRef.current.state === 'recording') {
      mediaRef.current.stop()
    }
  }

  const panelStyle = { display: 'flex', height: '100%', fontFamily: 'inherit' }
  const leftStyle = {
    width: '33%',
    borderRight: '1px solid var(--border-color, #333)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  }
  const rightStyle = { flex: 1, display: 'flex', flexDirection: 'column', padding: '8px' }
  const listHeaderStyle = { display: 'flex', alignItems: 'center', padding: '6px 8px', gap: '6px' }
  const searchStyle = {
    flex: 1, padding: '4px 8px', borderRadius: '4px',
    border: '1px solid var(--border-color, #333)',
    background: 'var(--input-bg, #1a1a1a)', color: 'var(--text-color, #fff)', fontSize: '13px',
  }
  const newBtnStyle = {
    padding: '4px 10px', borderRadius: '4px', cursor: 'pointer',
    background: 'var(--accent-color, #4a9eff)', color: '#fff', border: 'none', fontSize: '16px',
  }
  const itemStyle = (isSelected) => ({
    padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid var(--border-color, #222)',
    background: isSelected ? 'var(--selected-bg, #2a2a3a)' : 'transparent',
  })
  const inputStyle = {
    width: '100%', padding: '6px 8px', marginBottom: '6px', borderRadius: '4px',
    border: '1px solid var(--border-color, #333)',
    background: 'var(--input-bg, #1a1a1a)', color: 'var(--text-color, #fff)',
    fontSize: '15px', fontWeight: 'bold', boxSizing: 'border-box',
  }
  const textareaStyle = {
    flex: 1, width: '100%', padding: '6px 8px', borderRadius: '4px',
    border: '1px solid var(--border-color, #333)',
    background: 'var(--input-bg, #1a1a1a)', color: 'var(--text-color, #fff)',
    fontSize: '13px', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }
  const toolbarStyle = { display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }
  const btnStyle = (variant) => ({
    padding: '5px 14px', borderRadius: '4px', cursor: 'pointer', border: 'none',
    background: variant === 'primary' ? 'var(--accent-color, #4a9eff)' : 'var(--btn-bg, #333)',
    color: '#fff', fontSize: '13px',
  })

  return h('div', { style: panelStyle },
    h('div', { style: leftStyle },
      h('div', { style: listHeaderStyle },
        h('input', {
          style: searchStyle, placeholder: 'Search…', value: search,
          onChange: (e) => setSearch(e.target.value),
        }),
        h('button', { style: newBtnStyle, onClick: handleNew, title: 'New note' }, '+')
      ),
      h('div', { style: { flex: 1, overflowY: 'auto' } },
        filteredNotes.map((note) =>
          h('div', {
            key: note.id,
            style: itemStyle(selected?.id === note.id),
            onClick: () => selectNote(note),
          },
            h('div', { style: { fontWeight: 'bold', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, note.title),
            h('div', { style: { fontSize: '11px', opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } },
              note.body.slice(0, 60)
            )
          )
        )
      )
    ),
    h('div', { style: rightStyle },
      selected
        ? h(window.React.Fragment, null,
            h('input', { style: inputStyle, value: title, onChange: (e) => setTitle(e.target.value), placeholder: 'Title' }),
            h('textarea', { style: textareaStyle, value: body, onChange: (e) => setBody(e.target.value), placeholder: 'Start writing…' }),
            h('div', { style: toolbarStyle },
              h('button', { style: btnStyle('primary'), onClick: handleSave }, 'Save'),
              h('button', { style: btnStyle(), onClick: handleDelete }, 'Delete'),
              h('div', { style: { flex: 1 } }),
              h('button', {
                style: { ...btnStyle(), background: recording ? '#c00' : transcribing ? '#665500' : 'var(--btn-bg, #333)' },
                onClick: recording ? handleStopRecord : handleRecord,
                disabled: transcribing,
                title: recording ? 'Stop recording' : 'Record voice',
              }, transcribing ? 'Transcribing…' : recording ? '⏹ Stop' : '🎤')
            )
          )
        : h('div', { style: { opacity: 0.4, margin: 'auto', fontSize: '14px' } }, 'Select a note or create a new one')
    )
  )
}
