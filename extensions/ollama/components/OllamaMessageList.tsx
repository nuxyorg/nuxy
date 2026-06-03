const React = window.React

import type { ChatMessage } from '../types.ts'

interface Props {
  messages: ChatMessage[]
  loading: boolean
}

export function OllamaMessageList({ messages, loading }: Props) {
  const { EmptyState, MarkdownText } = window.UI || {}
  const _ChatList = (window.UI as any)?.ChatList || null
  const _ChatMessage = (window.UI as any)?.ChatMessage || null
  const bottomRef = React.useRef<HTMLDivElement | null>(null)
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null)
  const isAtBottomRef = React.useRef(true)

  React.useEffect(() => {
    if (loading) isAtBottomRef.current = true
  }, [loading])

  React.useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' })
    }
  }, [messages])

  return (
    <div
      ref={scrollContainerRef}
      onScroll={() => {
        const el = scrollContainerRef.current
        if (!el) return
        isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
      }}
      style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-1)',
      }}
    >
      {messages.length === 0 && !loading && EmptyState && (
        <EmptyState message="Ask Ollama anything." hint="Type in the omnibar and press Enter." />
      )}
      {_ChatList ? (
        <>
          <_ChatList messages={messages} />
          {loading && messages.at(-1)?.role !== 'assistant' && _ChatMessage && (
            <_ChatMessage role="assistant" content="…" />
          )}
        </>
      ) : (
        messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-lg)',
              background:
                msg.role === 'user' ? 'var(--surface-accent-subtle)' : 'var(--surface-overlay)',
              fontSize: 'var(--font-sm)',
              maxWidth: '80%',
            }}
          >
            {msg.role === 'assistant' && MarkdownText ? (
              <MarkdownText>{msg.content || (loading && i === messages.length - 1 ? '…' : '')}</MarkdownText>
            ) : (
              msg.content || (loading && i === messages.length - 1 ? '…' : '')
            )}
          </div>
        ))
      )}
      {loading && messages.at(-1)?.role !== 'assistant' && !_ChatMessage && (
        <div style={{ alignSelf: 'flex-start', opacity: 0.5, fontSize: 'var(--font-sm)' }}>…</div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
