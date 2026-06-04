const React = window.React

import type { ChatMessage } from '../types.ts'
import { ipc as ipcCall } from '../utils/ipc.ts'

interface Params {
  query: string
  messages: ChatMessage[]
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  selectedModel: string
}

export interface OllamaActions {
  loading: boolean
  error: string | null
  queuedMessage: string | null
  handleSend: (overrideText?: string) => Promise<void>
  handleQueue: (text: string) => void
  handleAbort: () => void
  handleClearChat: () => void
}

export function useOllamaActions({
  query,
  messages,
  setMessages,
  selectedModel,
}: Params): OllamaActions {
  const [loading, setLoading] = React.useState<boolean>(false)
  const [error, setError] = React.useState<string | null>(null)
  const [queuedMessage, setQueuedMessage] = React.useState<string | null>(null)
  const abortControllerRef = React.useRef<AbortController | null>(null)
  const queueRef = React.useRef<string | null>(null)
  const handleSendRef = React.useRef<(text?: string) => Promise<void>>(async () => {})

  // Process queued message when loading finishes
  React.useEffect(() => {
    if (!loading && queueRef.current) {
      const text = queueRef.current
      queueRef.current = null
      setQueuedMessage(null)
      void handleSendRef.current(text)
    }
  }, [loading])

  async function handleSend(overrideText?: string): Promise<void> {
    const text = overrideText ?? query.trim()
    if (!text || loading) return

    if (!overrideText) {
      window.dispatchEvent(
        new CustomEvent('nuxy-shell-omni-bar-control', { detail: { action: 'clear' } })
      )
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    const next: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setLoading(true)
    setError(null)

    let assistantContent = ''

    try {
      if (selectedModel) await ipcCall('configure', { model: selectedModel })
      const cfg = await ipcCall<{ host: string; model: string }>('getConfig')
      const host = cfg?.host ?? 'http://localhost:11434'
      const model = cfg?.model ?? selectedModel

      setMessages([...next, { role: 'assistant', content: '' }])

      const response = await fetch(`${host}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: next, stream: true }),
        signal: controller.signal,
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

      const finalMessages: ChatMessage[] = [
        ...next,
        { role: 'assistant', content: assistantContent },
      ]
      setMessages(finalMessages)
      ipcCall('history:save', { messages: finalMessages }).catch(() => {})
    } catch (err) {
      const e = err as Error
      if (e?.name === 'AbortError') {
        if (assistantContent) {
          const partial: ChatMessage[] = [...next, { role: 'assistant', content: assistantContent }]
          setMessages(partial)
          ipcCall('history:save', { messages: partial }).catch(() => {})
        } else {
          setMessages(next)
        }
      } else {
        setError(e?.message ?? String(err))
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last?.role === 'assistant' && last.content === '') return prev.slice(0, -1)
          return prev
        })
      }
    } finally {
      setLoading(false)
      abortControllerRef.current = null
    }
  }

  handleSendRef.current = handleSend

  function handleQueue(text: string): void {
    queueRef.current = text
    setQueuedMessage(text)
    window.dispatchEvent(
      new CustomEvent('nuxy-shell-omni-bar-control', { detail: { action: 'clear' } })
    )
  }

  function handleAbort(): void {
    abortControllerRef.current?.abort()
  }

  function handleClearChat(): void {
    setMessages([])
    ipcCall('history:clear').catch(() => {})
  }

  return {
    loading,
    error,
    queuedMessage,
    handleSend,
    handleQueue,
    handleAbort,
    handleClearChat,
  }
}
