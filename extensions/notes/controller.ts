import type { ShellAction } from '@nuxyorg/core'
import type { Note } from './types.ts'
import { deriveTitle } from './utils/note-title.ts'
import { invoke } from './utils/ipc.ts'
import { setToolSearchPlaceholder, BaseExtensionController } from '@nuxyorg/extension-sdk'

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
    super(
      EXT_ID,
      {
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
      },
      onUpdate
    )
  }

  connect(): void {
    if (!window.core?.ipc) return
    this.syncSearchPlaceholder()
    invoke<Note[]>('notes:list', {})
      .then((notes) => {
        this.store.setState({ notes, filteredNotes: notes })
        const q = this.state.query
        if (q.startsWith('select:')) {
          this.prevQuery = ''
          this.setQuery(q)
        }
      })
      .catch(() => {})

    invoke<{ fontSize: string }>('notes:getConfig', {})
      .then((cfg) => {
        if (cfg?.fontSize) this.store.setState({ fontSize: cfg.fontSize })
      })
      .catch(() => {})

    this.bindKeyboard()
    if (this.state.editMode) {
      this.syncEditBlurGuard()
    }

    const offShow = window.core?.window?.onShow?.(() => this.syncEditBlurGuard())
    if (offShow) this.cleanups.push(offShow)

    const onFocus = () => this.syncEditBlurGuard()
    window.addEventListener('focus', onFocus)
    this.cleanups.push(() => window.removeEventListener('focus', onFocus))
  }

  disconnect(): void {
    this.cleanups.forEach((fn) => fn())
    this.cleanups = []
    this.t.destroy()
    window.core?.shell?.registerShellActions(null)
    window.core?.window?.setBlurSuppressed?.(false, 'tool')
    window.core?.shell?.setShellResetPaused?.(false)
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
          selectedIndex: idx !== -1 ? idx : s.selectedIndex,
        })
        window.core?.shell?.controlOmniBar('clear')
        this.setEditMode(true)
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
    window.core?.shell?.refreshShellActions()
  }

  focusTextarea(ta?: HTMLTextAreaElement | null): void {
    const target = ta ?? this.textareaRef.current
    if (!target || !this.state.editMode) return
    target.focus()
    const len = target.value.length
    target.setSelectionRange(len, len)
  }

  setEditMode(editMode: boolean): void {
    this.store.setState({ editMode })
    void this.applyEditBlurGuard(editMode)
    if (editMode) {
      requestAnimationFrame(() => {
        const ta = this.textareaRef.current
        if (ta) {
          this.focusTextarea(ta)
        }
      })
    }
    window.core?.shell?.refreshShellActions()
  }

  /** Sync blur guard to main process; uses invoke when enabling for immediate effect. */
  private async applyEditBlurGuard(editMode: boolean): Promise<void> {
    window.core?.shell?.setShellResetPaused?.(editMode)
    const sync = window.core?.window?.setBlurSuppressedSync
    if (editMode && sync) {
      await sync(true, 'tool').catch(() => null)
      return
    }
    window.core?.window?.setBlurSuppressed?.(editMode, 'tool')
  }

  /** Re-apply edit-mode blur guard after focus/show cycles that may clear suppression. */
  private syncEditBlurGuard(): void {
    if (!this.state.editMode) return
    void this.applyEditBlurGuard(true)
  }

  async handleNew(): Promise<void> {
    const note = await invoke<Note>('notes:create', { title: 'New Note', body: '' })
    const updated = await invoke<Note[]>('notes:list', {})
    const filtered = this.filterNotes(updated, this.state.query)
    this.store.setState({
      notes: updated,
      filteredNotes: filtered,
      selected: note,
      body: '',
      selectedIndex: 0,
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
      selectedIndex: newIdx !== -1 ? newIdx : this.state.selectedIndex,
    })
    window.UI?.toast?.('Note saved!', { type: 'success' })
  }

  async handleDelete(): Promise<void> {
    const { selectedIndex, filteredNotes, selected } = this.state
    const noteToDelete = selectedIndex >= 0 ? filteredNotes[selectedIndex] : selected
    if (!noteToDelete) return
    await invoke('notes:delete', { id: noteToDelete.id })
    const list = await invoke<Note[]>('notes:list', {})
    const filtered = this.filterNotes(list, this.state.query)
    const newIndex =
      selectedIndex < filtered.length
        ? selectedIndex
        : filtered.length > 0
          ? filtered.length - 1
          : -1
    const newSelected = newIndex >= 0 ? filtered[newIndex] : null
    this.store.setState({
      notes: list,
      filteredNotes: filtered,
      selected: newSelected,
      body: newSelected?.body ?? '',
      selectedIndex: newIndex,
      editMode: false,
    })
    window.core?.window?.setBlurSuppressed?.(false, 'tool')
    window.UI?.toast?.('Note deleted', { type: 'info' })
    window.core?.shell?.refreshShellActions()
    if (newIndex === -1) window.core?.shell?.controlOmniBar('show')
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
        window.core?.shell?.refreshShellActions()
      }
      this.mediaRecorder = recorder
      recorder.start()
      this.store.setState({ recording: true })
      window.core?.shell?.refreshShellActions()
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

  private isDirty(): boolean {
    const { selected, body } = this.state
    if (!selected) return body !== ''
    return body !== (selected.body ?? '')
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
    if (selectedIndex >= 0 && selectedIndex < filteredNotes.length) {
      const note = filteredNotes[selectedIndex]
      if (note) {
        this.store.setState({ selected: note, body: note.body ?? '' })
        return
      }
    }
    this.store.setState({ selected: null, body: '' })
  }

  getKeyActions(): ShellAction[] {
    return this.buildActions()
  }

  /**
   * Single source of truth for both the footer (actions with a `hint`) and
   * the Ctrl+K palette (actions with `showInMenu: true`). The two are
   * mutually exclusive per action: the footer only has room for the
   * frequent operations — anything that doesn't fit there (recording
   * toggle) is Ctrl+K-only, with its key binding still live in the
   * background.
   */
  private buildActions(): ShellAction[] {
    const { editMode, selectedIndex, filteredNotes, selected, recording } = this.state
    const t = this.t.t

    return [
      {
        id: 'notes-new',
        key: 'n',
        modifiers: ['ctrl'],
        label: t('actions.newNote'),
        hint: '⌃N',
        activeOn: () => !editMode,
        handler: () => void this.handleNew(),
      },
      {
        id: 'notes-save',
        key: 's',
        modifiers: ['ctrl'],
        label: t('actions.saveNote'),
        hint: '⌃S',
        activeOn: () => editMode && selected !== null,
        handler: () => void this.handleSave(),
      },
      {
        id: 'notes-record',
        key: 'r',
        modifiers: ['ctrl'],
        label: recording ? t('actions.stopRecording') : t('actions.record'),
        section: 'actions',
        showInMenu: selected !== null,
        activeOn: () => selected !== null,
        handler: () => {
          if (this.state.recording) this.handleStopRecord()
          else void this.handleRecord()
        },
      },
      {
        id: 'notes-delete',
        key: 'Delete',
        label: t('actions.holdDeleteNote'),
        hint: 'Del',
        trigger: 'hold',
        holdCancelToast: t('actions.holdDeleteNote'),
        activeOn: () => !editMode && selectedIndex >= 0 && selectedIndex < filteredNotes.length,
        handler: () => void this.handleDelete(),
      },
      {
        id: 'notes-edit',
        key: 'Enter',
        label: t('actions.editNote'),
        hint: '↵',
        activeOn: () => !editMode && selectedIndex >= 0 && selectedIndex < filteredNotes.length,
        handler: () => {
          const note = filteredNotes[selectedIndex]
          if (note) {
            this.store.setState({ selected: note, body: note.body ?? '' })
            this.setEditMode(true)
          }
        },
      },
      {
        id: 'notes-exit-edit-dirty',
        key: 'Escape',
        label: t('actions.holdEscToExit'),
        hint: t('actions.holdEscHint'),
        trigger: 'hold',
        holdCancelToast: t('actions.unsavedHoldEscToExit'),
        activeOn: () => editMode && this.isDirty(),
        handler: () => this.setEditMode(false),
      },
      {
        id: 'notes-exit-edit',
        key: 'Escape',
        label: t('actions.focusSearchExitEdit'),
        hint: 'Esc',
        activeOn: () => editMode && !this.isDirty(),
        handler: () => {
          this.setEditMode(false)
        },
      },
      {
        id: 'notes-previous',
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
        id: 'notes-next',
        key: 'ArrowDown',
        label: t('actions.next'),
        allowRepeat: true,
        activeOn: () => !editMode,
        handler: () => {
          this.setSelectedIndex((prev) => {
            if (prev + 1 < filteredNotes.length) {
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
    window.core?.shell?.registerShellActions(() => this.buildActions())

    const handleEditEscCapture = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !this.state.editMode || this.isDirty()) return
      e.preventDefault()
      e.stopImmediatePropagation()
      this.setEditMode(false)
    }
    window.addEventListener('keydown', handleEditEscCapture, true)
    this.cleanups.push(() => window.removeEventListener('keydown', handleEditEscCapture, true))

    this.cleanups.push(() => {
      window.core?.shell?.registerShellActions(null)
    })
  }
}
