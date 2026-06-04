const React = window.React

const EXT_ID = 'com.nuxy.notes'
const _useTranslation =
  (window.UI || {}).useTranslation ||
  (() => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' as const }))

import { useNotesData } from './hooks/useNotesData.ts'
import { useNotesMeta } from './hooks/useNotesMeta.ts'
import { useNotesActions } from './hooks/useNotesActions.ts'
import { useNotesKeyboard } from './hooks/useNotesKeyboard.ts'
import { useNotesSync } from './hooks/useNotesSync.ts'
import { NotesLeftPanel } from './components/NotesLeftPanel.tsx'
import { NotesRightPanel } from './components/NotesRightPanel.tsx'

interface Props {
  query: string
}

export default function NotesApp({ query }: Props) {
  const { TwoPanel } = window.UI || {}
  const { t } = _useTranslation(EXT_ID)

  const { notes, setNotes, fontSize } = useNotesData()

  const {
    selected,
    setSelected,
    body,
    setBody,
    editMode,
    setEditMode,
    selectedIndex,
    setSelectedIndex,
    textareaRef,
    filteredNotes,
  } = useNotesMeta({ query, notes, editMode: false })

  const {
    recording,
    transcribing,
    handleNew,
    handleSave,
    handleDelete,
    handleRecord,
    handleStopRecord,
  } = useNotesActions({
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
  })

  useNotesKeyboard({
    filteredNotes,
    selected,
    selectedIndex,
    editMode,
    recording,
    setSelectedIndex,
    setSelected,
    setBody,
    setEditMode,
    handlers: { handleNew, handleSave, handleDelete, handleRecord, handleStopRecord },
    t,
  })

  useNotesSync({ selected, recording, editMode, selectedIndex })

  const leftPanel = (
    <NotesLeftPanel
      filteredNotes={filteredNotes}
      selectedIndex={selectedIndex}
      query={query}
      onSelect={setSelectedIndex}
    />
  )

  const rightPanel = (
    <NotesRightPanel
      selected={selected}
      body={body}
      editMode={editMode}
      transcribing={transcribing}
      fontSize={fontSize}
      textareaRef={textareaRef}
      onBodyChange={setBody}
    />
  )

  return (
    <div
      className={`nuxy-notes-app ${editMode ? 'nuxy-notes-edit-mode' : ''}`}
      style={{ height: '100%' }}
    >
      <style>{`
        .nuxy-notes-edit-mode .nuxy-two-panel__left {
          display: none !important;
        }
      `}</style>
      {TwoPanel ? <TwoPanel left={leftPanel} right={rightPanel} /> : leftPanel}
    </div>
  )
}
