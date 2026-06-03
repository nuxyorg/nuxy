const React = window.React

import type { Note } from '../types.ts'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
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
          <div style={{ marginBottom: '4px', color: 'var(--error, #f87171)', fontWeight: 500 }}>
            Render error
          </div>
          <div style={{ opacity: 0.7 }}>{this.state.error.message}</div>
        </div>
      )
    }
    return this.props.children
  }
}

interface Props {
  selected: Note | null
  body: string
  editMode: boolean
  transcribing: boolean
  fontSize: string
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onBodyChange: (value: string) => void
}

export function NotesRightPanel({
  selected,
  body,
  editMode,
  transcribing,
  fontSize,
  textareaRef,
  onBodyChange,
}: Props) {
  const { Textarea, EmptyState, MarkdownText } = window.UI || {}
  const Editor = Textarea || 'textarea'

  if (editMode && selected) {
    return (
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
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onBodyChange(e.target.value)}
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
    )
  }

  if (selected) {
    return (
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
        <div
          style={{
            fontSize: '1.2em',
            fontWeight: 'bold',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            paddingBottom: '8px',
          }}
        >
          {selected.title}
        </div>
        <div
          style={{
            flex: 1,
            whiteSpace: 'pre-wrap',
            opacity: 0.8,
            fontSize,
            lineHeight: '1.5',
          }}
        >
          {MarkdownText ? (
            <ErrorBoundary>
              <MarkdownText>{selected.body}</MarkdownText>
            </ErrorBoundary>
          ) : (
            selected.body
          )}
        </div>
      </div>
    )
  }

  return (
    <EmptyState
      message="Select a note or create a new one."
      hint="Use ⌃N to create a new note."
    />
  )
}
