const React = window.React

import type { Note } from '../types.ts'

interface Params {
  query: string
  notes: Note[]
  editMode: boolean
}

interface SelectionState {
  selected: Note | null
  setSelected: React.Dispatch<React.SetStateAction<Note | null>>
  body: string
  setBody: React.Dispatch<React.SetStateAction<string>>
  editMode: boolean
  setEditMode: React.Dispatch<React.SetStateAction<boolean>>
  selectedIndex: number
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  filteredNotes: Note[]
}

export function useNotesMeta({ query, notes, editMode: editModeIn }: Params): SelectionState {
  const filteredNotes = React.useMemo(() => {
    if (!query.trim() || query.startsWith('select:')) return notes
    const q = query.toLowerCase()
    return notes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
    )
  }, [notes, query])

  const [selected, setSelected] = React.useState<Note | null>(null)
  const [body, setBody] = React.useState<string>('')
  const [editMode, setEditMode] = React.useState<boolean>(false)
  const [selectedIndex, setSelectedIndex] = React.useState<number>(-1)
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)

  // Inline reset: when query changes to a real search query, reset selectedIndex during render
  const [prevQuery, setPrevQuery] = React.useState(query)
  if (query !== prevQuery) {
    setPrevQuery(query)
    if (query && !query.startsWith('select:')) {
      setSelectedIndex(-1)
    }
  }

  // Handle select: query from search provider click
  React.useEffect(() => {
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
        setEditMode(false)
        window.dispatchEvent(
          new CustomEvent('nuxy-shell-omni-bar-control', { detail: { action: 'clear' } })
        )
      }
    }
  }, [query, notes, filteredNotes])

  // Sync selected note when selectedIndex changes
  React.useEffect(() => {
    if (editMode) return
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

  // Focus textarea when editMode becomes true
  React.useEffect(() => {
    if (editMode && textareaRef.current) {
      textareaRef.current.focus()
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [editMode])

  return { selected, setSelected, body, setBody, editMode, setEditMode, selectedIndex, setSelectedIndex, textareaRef, filteredNotes }
}
