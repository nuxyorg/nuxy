const React = window.React
const { useState, useEffect, useRef } = React

import type { ChatMessage } from './types.ts'

const EXT_ID = 'com.nuxy.ollama'

interface Props {
  query: string
}

interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export default function OllamaApp({ query: _query }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [models, setModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const ipc = <T = unknown>(channel: string, payload?: unknown): Promise<T> =>
    window.core.ipc.invoke(EXT_ID, channel, payload).then((res) => {
      const r = res as IpcResponse<T>
      if (!r?.success) throw new Error(r?.error || 'IPC call failed')
      return r.data as T
    })

  useEffect(() => {
    ipc<string[]>('models', {})
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setModels(list)
          setSelectedModel(list[0])
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(): Promise<void> {
    const text = input.trim()
    if (!text || loading) return

    const next: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      if (selectedModel) {
        await ipc('configure', { model: selectedModel })
      }
      const res = await ipc<{ content?: string }>('chat', { messages: next })
      const reply = res?.content ?? ''
      setMessages((prev: ChatMessage[]) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      const error = err as Error
      setMessages((prev: ChatMessage[]) => [
        ...prev,
        { role: 'assistant', content: `Error: ${error?.message ?? String(err)}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 12, gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          value={selectedModel}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedModel(e.target.value)}
          style={{ flex: 1, padding: '4px 8px', borderRadius: 6 }}
        >
          {models.length === 0 ? (
            <option value="">No models found</option>
          ) : (
            models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))
          )}
        </select>
      </div>
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: '4px 0',
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              background:
                msg.role === 'user'
                  ? 'var(--color-accent, #3b82f6)'
                  : 'var(--color-surface-2, rgba(255,255,255,0.08))',
              color: msg.role === 'user' ? '#fff' : 'inherit',
              borderRadius: 10,
              padding: '6px 10px',
              maxWidth: '80%',
              fontSize: 13,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div
            style={{ alignSelf: 'flex-start', opacity: 0.5, fontSize: 12, padding: '4px 10px' }}
          >
            ...
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <textarea
          value={input}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Ollama…"
          rows={2}
          style={{ flex: 1, resize: 'none', padding: '6px 10px', borderRadius: 8, fontSize: 13 }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{ padding: '0 14px', borderRadius: 8, cursor: 'pointer' }}
        >
          Send
        </button>
      </div>
    </div>
  )
}
