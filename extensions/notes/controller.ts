import type { ShellKeyAction } from '@nuxy/core'
import type { Note } from './types.ts'
import { deriveTitle } from './utils/noteTitle.ts'
import { invoke } from './utils/ipc.ts'
import { setToolSearchPlaceholder } from '../tool-behavior.ts'
import { BaseExtensionController } from '../base-controller.ts'

const EXT_ID = 'com.nuxy.notes'

export interface NotesState {
  notes: Note[]
  fontSize: string
  selected: Note | null
  body: string
  editMode: boolean
  selectedIndex: number
  recording: boolean
  transcribing: boolean
  query: string
  filteredNotes: Note[]
}

export class NotesController extends BaseExtensionController<NotesState> {
  readonly textareaRef = { current: null as HTMLTextAreaElement | null }

  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private prevQuery = ''

  constructor(onUpdate: () => void) {
    super(EXT_ID, {
      notes: [],
      fontSize: '14px',
      selected: null,
      body: '',
      editMode: false,
      selectedIndex: -1,
      recording: false,
      transcribing: false,
      query: '',
      filteredNotes: [],
    }, onUpdate)
  }

  connect(): void {
    if (!window.core?.ipc) return
    this.syncSearchPlaceholder()
    invoke<Note[]>('notes:list', {})
      .then((notes) => {
        this.store.setState({ notes, filteredNotes: notes })
      })
      .catch(() => {})

    invoke<{ fontSize: string }>('notes:getConfig', {})
      .then((cfg) => {
        if (cfg?.fontSize) this.store.setState({ fontSize: cfg.fontSize })
      })
      .catch(() => {})

    this.bindKeyboard()
  }

  disconnect(): void {
    this.cleanups.forEach((fn) => fn())
    this.cleanups = []
    this.t.destroy()
    window.core?.shell?.registerActions([])
    window.core?.shell?.registerKeyActions(null)
  }

  syncSearchPlaceholder(): void {
    setToolSearchPlaceholder(this.t.t, 'search.placeholder')
  }

  setQuery(query: string): void {
    const s = this.state
    if (query !== this.prevQuery) {
      this.prevQuery = query
      if (query && !query.startsWith('select:')) {
        this.store.setState({ query, selectedIndex: -1 })
        this.syncFilteredNotes()
        return
      }
    }

    this.store.setState({ query })
    this.syncFilteredNotes()

    if (query.startsWith('select:')) {
      const noteId = query.substring('select:'.length)
      const note = s.notes.find((n) => n.id === noteId)
      if (note) {
        const filtered = this.filterNotes(s.notes, query)
        const idx = filtered.findIndex((n) => n.id === noteId)
        this.store.setState({
          selected: note,
          body: note.body ?? '',
          selectedIndex: idx !== -1 ? idx + 1 : s.selectedIndex,
          editMode: false,
        })
        window.core?.shell?.controlOmniBar('clear')
      }
    }
  }

  setBody(body: string): void {
    this.store.setState({ body })
  }

  setSelectedIndex(index: number | ((prev: number) => number)): void {
    const prev = this.state.selectedIndex
    const next = typeof index === 'function' ? index(prev) : index
    this.store.setState({ selectedIndex: next })
    this.syncSelectionFromIndex()
    window.core?.shell?.refreshKeyHints()
  }

  setEditMode(editMode: boolean): void {
    this.store.setState({ editMode })
    if (editMode) {
      requestAnimationFrame(() => {
        const ta = this.textareaRef.current
        if (ta) {
          ta.focus()
          const len = ta.value.length
          ta.setSelectionRange(len, len)
        }
      })
    }
    window.core?.shell?.refreshKeyHints()
  }

  async handleNew(): Promise<void> {
    const note = await invoke<Note>('notes:create', { title: 'New Note', body: '' })
    const updated = await invoke<Note[]>('notes:list', {})
    this.store.setState({
      notes: updated,
      filteredNotes: this.filterNotes(updated, this.state.query),
      selected: note,
      body: '',
      selectedIndex: 1,
    })
    this.setEditMode(true)
  }

  async handleSave(): Promise<void> {
    const { selected, body, query } = this.state
    if (!selected) return
    const title = deriveTitle(body)
    const updated = await invoke<Note>('notes:update', { id: selected.id, title, body })
    const list = await invoke<Note[]>('notes:list', {})
    const filtered = this.filterNotes(list, query)
    const newIdx = filtered.findIndex((n) => n.id === updated.id)
    this.store.setState({
      selected: updated,
      notes: list,
      filteredNotes: filtered,
      selectedIndex: newIdx !== -1 ? newIdx + 1 : this.state.selectedIndex,
    })
    window.UI?.toast?.('Note saved!', { type: 'success' })
  }

  async handleDelete(): Promise<void> {
    const { selectedIndex, filteredNotes, selected } = this.state
    const noteToDelete = selectedIndex > 0 ? filteredNotes[selectedIndex - 1] : selected
    if (!noteToDelete) return
    await invoke('notes:delete', { id: noteToDelete.id })
    const list = await invoke<Note[]>('notes:list', {})
    this.store.setState({
      notes: list,
      filteredNotes: this.filterNotes(list, this.state.query),
      selected: null,
      body: '',
      selectedIndex: 0,
      editMode: false,
    })
    window.UI?.toast?.('Note deleted', { type: 'info' })
    window.core?.shell?.refreshKeyHints()
  }

  async handleRecord(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      this.audioChunks = []
      recorder.ondataavailable = (e: BlobEvent) => this.audioChunks.push(e.data)
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        this.store.setState({ recording: false })
        this.store.setState({ transcribing: true })
        try {
          const blob = new Blob(this.audioChunks, { type: 'audio/webm' })
          const arrayBuffer = await blob.arrayBuffer()
          const audioBuffer = Array.from(new Uint8Array(arrayBuffer))
          const result = await invoke<{ transcript: string }>('notes:transcribe', { audioBuffer })
          const prev = this.state.body
          this.store.setState({
            body: prev + (prev ? ' ' : '') + result.transcript,
            transcribing: false,
          })
        } catch {
          this.store.setState({ transcribing: false })
        }
        window.core?.shell?.refreshKeyHints()
      }
      this.mediaRecorder = recorder
      recorder.start()
      this.store.setState({ recording: true })
      window.core?.shell?.refreshKeyHints()
      setTimeout(() => recorder.state === 'recording' && recorder.stop(), 10000)
    } catch {
      this.store.setState({ recording: false })
    }
  }

  handleStopRecord(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop()
    }
  }

  private filterNotes(notes: Note[], query: string): Note[] {
    if (!query.trim() || query.startsWith('select:')) return notes
    const q = query.toLowerCase()
    return notes.filter(
      (n) => (n.title ?? '').toLowerCase().includes(q) || (n.body ?? '').toLowerCase().includes(q)
    )
  }

  private syncFilteredNotes(): void {
    this.store.setState({ filteredNotes: this.filterNotes(this.state.notes, this.state.query) })
  }

  private syncSelectionFromIndex(): void {
    const { selectedIndex, filteredNotes, editMode } = this.state
    if (editMode) return
    if (selectedIndex > 0 && selectedIndex <= filteredNotes.length) {
      const note = filteredNotes[selectedIndex - 1]
      if (note) {
        this.store.setState({ selected: note, body: note.body ?? '' })
        return
      }
    }
    this.store.setState({ selected: null, body: '' })
  }

  private getKeyActions(): ShellKeyAction[] {
    const { editMode, selectedIndex, filteredNotes, selected } = this.state
    const t = this.t.t

    return [
      {
        key: 'n',
        modifiers: ['ctrl'],
        label: t('actions.newNote'),
        hint: '⌃N',
        handler: () => void this.handleNew(),
      },
      {
        key: 's',
        modifiers: ['ctrl'],
        label: t('actions.saveNote'),
        hint: '⌃S',
        activeOn: () => editMode && selected !== null,
        handler: () => void this.handleSave(),
      },
      {
        key: 'Delete',
        label: t('actions.deleteNote'),
        hint: 'Del',
        activeOn: () => !editMode && selectedIndex > 0 && selectedIndex <= filteredNotes.length,
        handler: () => void this.handleDelete(),
      },
      {
        key: 'Enter',
        label: t('actions.editNote'),
        hint: '↵',
        activeOn: () => !editMode && selectedIndex >= 0 && selectedIndex <= filteredNotes.length,
        handler: () => {
          if (selectedIndex === 0) {
            void this.handleNew()
          } else {
            const note = filteredNotes[selectedIndex - 1]
            if (note) {
              this.store.setState({ selected: note, body: note.body ?? '' })
              this.setEditMode(true)
            }
          }
        },
      },
      {
        key: 'Escape',
        label: t('actions.focusSearchExitEdit'),
        hint: 'Esc',
        activeOn: () => editMode,
        handler: () => {
          this.setEditMode(false)
        },
      },
      {
        key: 'ArrowUp',
        label: t('actions.previous'),
        allowRepeat: true,
        activeOn: () => !editMode,
        handler: () => {
          this.setSelectedIndex((prev) => {
            if (prev <= 0) {
              window.core?.shell?.controlOmniBar('show')
              return -1
            }
            return prev - 1
          })
        },
      },
      {
        key: 'ArrowDown',
        label: t('actions.next'),
        allowRepeat: true,
        activeOn: () => !editMode,
        handler: () => {
          this.setSelectedIndex((prev) => {
            const maxIdx = filteredNotes.length
            if (prev < maxIdx) {
              if (prev === -1) window.core?.shell?.controlOmniBar('hide')
              return prev + 1
            }
            return prev
          })
        },
      },
    ]
  }

  private bindKeyboard(): void {
    window.core?.shell?.registerKeyActions(() => this.getKeyActions())

    const registerActions = () => {
      const { selected, recording } = this.state
      const t = this.t.t
      const actions: { id: string; label: string; onExecute: () => void }[] = [
        { id: 'notes-new', label: t('actions.newNote'), onExecute: () => void this.handleNew() },
      ]
      if (selected !== null) {
        actions.push(
          { id: 'notes-save', label: t('actions.save'), onExecute: () => void this.handleSave() },
          {
            id: 'notes-delete',
            label: t('actions.delete'),
            onExecute: () => void this.handleDelete(),
          },
          {
            id: 'notes-record',
            label: recording ? t('actions.stopRecording') : t('actions.record'),
            onExecute: () => {
              if (recording) this.handleStopRecord()
              else void this.handleRecord()
            },
          }
        )
      }
      window.core?.shell?.registerActions(actions)
    }

    registerActions()
    this.store.subscribe(() => {
      registerActions()
      window.core?.shell?.refreshKeyHints()
    })

    this.cleanups.push(() => {
      window.core?.shell?.registerKeyActions(null)
      window.core?.shell?.registerActions([])
    })
  }
}
