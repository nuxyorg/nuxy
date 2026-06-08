import { h } from '../ce-utils.ts'
import {
  ceEmptyState,
  ceList,
  ceListItem,
  ceListItemBody,
  ceListItemMeta,
  ceListItemText,
  ceLoadingState,
  ceMarkdownText,
  ceTextarea,
  ceTwoPanel,
} from '../ui-ce.ts'
import type { NotesController } from './notes-controller.ts'

export function renderNotesApp(ctrl: NotesController): HTMLElement {
  const s = ctrl.state
  const app = h(
    'div',
    {
      className: `nuxy-notes-app${s.editMode ? ' nuxy-notes-edit-mode' : ''}`,
      style: { height: '100%' },
    },
    h('style', null, `
        .nuxy-notes-edit-mode .nuxy-two-panel__left {
          display: none !important;
        }
      `),
    renderTwoPanel(ctrl)
  )
  return app
}

function renderTwoPanel(ctrl: NotesController): HTMLElement {
  return ceTwoPanel(renderLeftPanel(ctrl), renderRightPanel(ctrl))
}

function renderLeftPanel(ctrl: NotesController): HTMLElement {
  const { filteredNotes, selectedIndex, query } = ctrl.state
  const wrap = document.createElement('div')

  wrap.appendChild(h('nuxy-section-header', { label: 'Notes' }))

  const list = ceList()
  list.appendChild(
    ceListItem({ active: selectedIndex === 0, onClick: () => ctrl.setSelectedIndex(0) },
      ceListItemBody(null,
        ceListItemText(null, 'New Note'),
        ceListItemMeta(null, 'Create a new note')
      )
    )
  )

  if (filteredNotes.length === 0) {
    list.appendChild(
      ceEmptyState({
        message: query ? 'No matching notes.' : 'No notes yet.',
        hint: 'Use ⌃N to create a new note.',
      })
    )
  } else {
    filteredNotes.forEach((note, idx) => {
      list.appendChild(
        ceListItem({
          active: idx + 1 === selectedIndex,
          onClick: () => ctrl.setSelectedIndex(idx + 1),
        },
          ceListItemBody(null,
            ceListItemText(null, note.title),
            ceListItemMeta(null, note.body.slice(0, 60))
          )
        )
      )
    })
  }

  wrap.appendChild(list)
  return wrap
}

function renderRightPanel(ctrl: NotesController): HTMLElement {
  const { selected, body, editMode, transcribing, fontSize } = ctrl.state

  if (editMode && selected) {
    const wrap = h('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: 'var(--space-2)',
        gap: 'var(--space-2)',
      },
    })
    wrap.appendChild(
      ceTextarea({
        className: 'nuxy-textarea',
        value: body,
        placeholder: transcribing ? 'Transcribing…' : 'Start writing…',
        style: {
          flex: '1',
          resize: 'none',
          width: '100%',
          height: '100%',
          border: 'none',
          background: 'transparent',
          color: 'var(--text, #ffffff)',
          outline: 'none',
          padding: 'var(--space-4, 12px)',
          fontSize,
        },
        ref: (el) => {
          ctrl.textareaRef.current = el
        },
        onChange: (val) => ctrl.setBody(val),
      })
    )
    return wrap
  }

  if (selected) {
    const wrap = h('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: 'var(--space-4, 12px)',
        overflowY: 'auto',
        color: 'var(--text, #ffffff)',
        gap: 'var(--space-2)',
      },
    })
    wrap.appendChild(
      h('div', {
        style: {
          fontSize: '1.2em',
          fontWeight: 'bold',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: '8px',
        },
      }, selected.title)
    )
    const bodyEl = h('div', {
      style: {
        flex: '1',
        whiteSpace: 'pre-wrap',
        opacity: '0.8',
        fontSize,
        lineHeight: '1.5',
      },
    })
    bodyEl.appendChild(ceMarkdownText(selected.body))
    wrap.appendChild(bodyEl)
    return wrap
  }

  return ceEmptyState({
    message: 'Select a note or create a new one.',
    hint: 'Use ⌃N to create a new note.',
  })
}
