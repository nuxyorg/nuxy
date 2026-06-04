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
  t: (key: string) => string
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
  t,
}: Params): void {
  const { handleNew, handleSave, handleDelete, handleRecord, handleStopRecord } = handlers
  const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

  _useToolKeyActions(
    React.useMemo(
      () => [
        {
          key: 'n',
          modifiers: ['ctrl'] as const,
          label: t('actions.newNote'),
          hint: '⌃N',
          handler: () => {
            void handleNew()
          },
        },
        {
          key: 's',
          modifiers: ['ctrl'] as const,
          label: t('actions.saveNote'),
          hint: '⌃S',
          activeOn: () => editMode && selected !== null,
          handler: () => {
            void handleSave()
          },
        },
        {
          key: 'Delete',
          label: t('actions.deleteNote'),
          hint: 'Del',
          activeOn: () => !editMode && selectedIndex > 0 && selectedIndex <= filteredNotes.length,
          handler: () => {
            void handleDelete()
          },
        },
        {
          key: 'Enter',
          label: t('actions.editNote'),
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
          label: t('actions.focusSearchExitEdit'),
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
          label: t('actions.previous'),
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
          label: t('actions.next'),
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
      [editMode, selectedIndex, filteredNotes, selected, t]
    )
  )

  // Register command palette actions
  React.useEffect(() => {
    const actions: { id: string; label: string; onExecute: () => void }[] = [
      {
        id: 'notes-new',
        label: t('actions.newNote'),
        onExecute: () => {
          void handleNew()
        },
      },
    ]
    if (selected !== null) {
      actions.push(
        {
          id: 'notes-save',
          label: t('actions.save'),
          onExecute: () => {
            void handleSave()
          },
        },
        {
          id: 'notes-delete',
          label: t('actions.delete'),
          onExecute: () => {
            void handleDelete()
          },
        },
        {
          id: 'notes-record',
          label: recording ? t('actions.stopRecording') : t('actions.record'),
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
  }, [selected, recording, editMode, t])
}
