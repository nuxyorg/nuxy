const React = window.React

import type { Note } from '../types.ts'

interface Handlers {
  handleNew: () => Promise<void>
  handleSave: () => Promise<void>
  handleDelete: () => Promise<void>
  handleRecord: () => Promise<void>
  handleStopRecord: () => void
}

interface Params {
  filteredNotes: Note[]
  selected: Note | null
  selectedIndex: number
  editMode: boolean
  recording: boolean
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
  setSelected: React.Dispatch<React.SetStateAction<Note | null>>
  setBody: React.Dispatch<React.SetStateAction<string>>
  setEditMode: React.Dispatch<React.SetStateAction<boolean>>
  handlers: Handlers
}

export function useNotesKeyboard({
  filteredNotes,
  selected,
  selectedIndex,
  editMode,
  recording,
  setSelectedIndex,
  setSelected,
  setBody,
  setEditMode,
  handlers,
}: Params): void {
  const { handleNew, handleSave, handleDelete, handleRecord, handleStopRecord } = handlers
  const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

  _useToolKeyActions(
    React.useMemo(
      () => [
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
      ],
      [editMode, selectedIndex, filteredNotes, selected]
    )
  )

  // Register command palette actions
  React.useEffect(() => {
    const actions: { id: string; label: string; onExecute: () => void }[] = [
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
}
