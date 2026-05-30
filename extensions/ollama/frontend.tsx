const React = window.React
const { useState, useEffect, useRef } = React

import type { ChatMessage } from './types.ts'

const EXT_ID = 'com.nuxy.ollama'

const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

interface Props {
  query: string
}

interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export default function OllamaApp({ query }: Props) {
  const { EmptyState, Alert, MarkdownText } = window.UI || {}
  const _ChatList = (window.UI || {}).ChatList || null
  const _ChatMessage = (window.UI || {}).ChatMessage || null

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [models, setModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const ipc = <T = unknown,>(channel: string, payload?: unknown): Promise<T> =>
    window.core.ipc.invoke(EXT_ID, channel, payload).then((res) => {
      const r = res as IpcResponse<T>
      if (!r?.success) throw new Error(r?.error || 'IPC call failed')
      return r.data as T
    })

  useEffect(() => {
    Promise.all([
      ipc<{ host: string; model: string }>('getConfig').catch(() => null),
      ipc<ChatMessage[]>('history:load').catch(() => [] as ChatMessage[]),
      ipc<string[]>('models', {}).catch(() => [] as string[]),
    ]).then(([cfg, history, modelList]) => {
      const list = Array.isArray(modelList) ? modelList : []
      setModels(list)

      const savedModel = cfg?.model ?? ''
      const activeModel = savedModel && list.includes(savedModel) ? savedModel : (list[0] ?? '')
      setSelectedModel(activeModel)

      if (Array.isArray(history) && history.length > 0) {
        setMessages(history)
      }
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [messages])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [query, loading, messages.length, models.length, selectedModel])

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('nuxy-shell-footer-hints', {
        detail: selectedModel ? <span>Model: {selectedModel}</span> : null,
      })
    )
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-shell-footer-hints', { detail: null }))
    }
  }, [selectedModel])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-gradient-toggle', { detail: loading }))
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-gradient-toggle', { detail: false }))
    }
  }, [loading])

  async function handleSend(): Promise<void> {
    const text = query.trim()
    if (!text || loading) return

    window.dispatchEvent(new CustomEvent('nuxy-shell-omni-bar-control', { detail: { action: 'clear' } }))

    const next: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setLoading(true)
    setError(null)

    let assistantContent = ''

    try {
      if (selectedModel) await ipc('configure', { model: selectedModel })
      const cfg = await ipc<{ host: string; model: string }>('getConfig')
      const host = cfg?.host ?? 'http://localhost:11434'
      const model = cfg?.model ?? selectedModel

      setMessages([...next, { role: 'assistant', content: '' }])

      const response = await fetch(`${host}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: next, stream: true }),
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Ollama HTTP ${response.status}: ${errText}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const chunk = JSON.parse(line) as { message?: { content: string }; done: boolean }
            if (chunk.message?.content) {
              assistantContent += chunk.message.content
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last?.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, content: assistantContent }
                }
                return updated
              })
            }
          } catch {}
        }
      }

      const finalMessages: ChatMessage[] = [...next, { role: 'assistant', content: assistantContent }]
      setMessages(finalMessages)
      ipc('history:save', { messages: finalMessages }).catch(() => {})
    } catch (err) {
      const e = err as Error
      setError(e?.message ?? String(err))
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last?.role === 'assistant' && last.content === '') return prev.slice(0, -1)
        return prev
      })
    } finally {
      setLoading(false)
    }
  }

  _useToolKeyActions([
    {
      key: 'Enter',
      label: 'Send',
      hint: '↵',
      activeOn: () => query.trim().length > 0 && !loading,
      handler: () => {
        void handleSend()
      },
    },
    {
      key: 'n',
      modifiers: ['ctrl'] as ('ctrl' | 'shift' | 'alt' | 'meta')[],
      label: 'Clear chat',
      hint: ['ctrl', 'N'],
      handler: () => {
        setMessages([])
        ipc('history:clear').catch(() => {})
      },
    },
    {
      key: 'ArrowUp',
      modifiers: ['ctrl'] as ('ctrl' | 'shift' | 'alt' | 'meta')[],
      label: 'Navigate models',
      hint: ['ctrl', '↑↓'],
      activeOn: () => models.length > 1,
      handler: () => {
        const idx = models.indexOf(selectedModel)
        if (idx > 0) setSelectedModel(models[idx - 1])
      },
    },
    {
      key: 'ArrowDown',
      modifiers: ['ctrl'] as ('ctrl' | 'shift' | 'alt' | 'meta')[],
      label: '',
      activeOn: () => models.length > 1,
      handler: () => {
        const idx = models.indexOf(selectedModel)
        if (idx < models.length - 1) setSelectedModel(models[idx + 1])
      },
    },
  ])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        gap: 'var(--space-2)',
        padding: 'var(--space-2)',
      }}
    >
      {error && Alert && <Alert variant="danger">{error}</Alert>}
      <div
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
    </div>
  )
}
