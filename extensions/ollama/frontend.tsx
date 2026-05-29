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
  const {
    List,
    ListItem,
    ListItemBody,
    ListItemText,
    ListItemMeta,
    EmptyState,
    Button,
    SelectBox,
    Alert,
    Textarea,
  } = window.UI || {}

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [models, setModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [modelOpen, setModelOpen] = useState<boolean>(false)
  const [modelFocusedIndex, setModelFocusedIndex] = useState<number>(0)
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
    setError(null)

    try {
      if (selectedModel) {
        await ipc('configure', { model: selectedModel })
      }
      const res = await ipc<{ content?: string }>('chat', { messages: next })
      const reply = res?.content ?? ''
      setMessages((prev: ChatMessage[]) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      const e = err as Error
      setError(e?.message ?? String(err))
    } finally {
      setLoading(false)
    }
  }

  const modelOptions = models.map((m) => ({ value: m, label: m }))
  const selectedModelIndex = models.indexOf(selectedModel)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 'var(--space-2)', padding: 'var(--space-2)' }}>
      {models.length > 0 && SelectBox && (
        <SelectBox
          options={modelOptions}
          open={modelOpen}
          focusedIndex={modelFocusedIndex >= 0 ? modelFocusedIndex : 0}
          onSelect={(opt: { value: string }) => {
            setSelectedModel(opt.value)
            setModelOpen(false)
          }}
          onClose={() => setModelOpen(false)}
          onOpen={() => {
            setModelOpen(true)
            setModelFocusedIndex(selectedModelIndex >= 0 ? selectedModelIndex : 0)
          }}
        />
      )}
      {error && Alert && <Alert variant="danger">{error}</Alert>}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        {messages.length === 0 && !loading && (
          <EmptyState message="Ask Ollama anything." hint="Type your message below." />
        )}
        {List && (
          <List>
            {messages.map((msg, i) => (
              <ListItem key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <ListItemBody>
                  <ListItemText>{msg.content}</ListItemText>
                  <ListItemMeta>{msg.role === 'user' ? 'You' : 'Ollama'}</ListItemMeta>
                </ListItemBody>
              </ListItem>
            ))}
          </List>
        )}
        {loading && (
          <ListItem>
            <ListItemBody>
              <ListItemText style={{ opacity: 0.5 }}>…</ListItemText>
            </ListItemBody>
          </ListItem>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        {Textarea && (
          <Textarea
            value={input}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSend()
              }
            }}
            placeholder="Ask Ollama… (Enter to send, Shift+Enter for newline)"
            rows={2}
            style={{
              flex: 1,
              resize: 'none',
            }}
          />
        )}
        {Button && (
          <Button onClick={() => { void handleSend() }} disabled={loading || !input.trim()}>
            Send
          </Button>
        )}
      </div>
    </div>
  )
}
