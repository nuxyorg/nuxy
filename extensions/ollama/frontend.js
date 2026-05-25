const EXT_ID = 'com.nuxy.ollama'
const { useState, useEffect, useRef } = window.React

export default function OllamaApp() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    window.core?.ipc
      ?.invoke(EXT_ID, 'models', {})
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

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      if (selectedModel) {
        await window.core?.ipc?.invoke(EXT_ID, 'configure', { model: selectedModel })
      }
      const res = await window.core?.ipc?.invoke(EXT_ID, 'chat', { messages: next })
      const reply = res?.content ?? ''
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err?.message ?? err}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return window.React.createElement(
    'div',
    { style: { display: 'flex', flexDirection: 'column', height: '100%', padding: 12, gap: 8 } },
    window.React.createElement(
      'div',
      { style: { display: 'flex', gap: 8, alignItems: 'center' } },
      window.React.createElement(
        'select',
        {
          value: selectedModel,
          onChange: (e) => setSelectedModel(e.target.value),
          style: { flex: 1, padding: '4px 8px', borderRadius: 6 },
        },
        models.length === 0
          ? window.React.createElement('option', { value: '' }, 'No models found')
          : models.map((m) => window.React.createElement('option', { key: m, value: m }, m))
      )
    ),
    window.React.createElement(
      'div',
      {
        style: {
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: '4px 0',
        },
      },
      messages.map((msg, i) =>
        window.React.createElement(
          'div',
          {
            key: i,
            style: {
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              background: msg.role === 'user' ? 'var(--color-accent, #3b82f6)' : 'var(--color-surface-2, rgba(255,255,255,0.08))',
              color: msg.role === 'user' ? '#fff' : 'inherit',
              borderRadius: 10,
              padding: '6px 10px',
              maxWidth: '80%',
              fontSize: 13,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            },
          },
          msg.content
        )
      ),
      loading &&
        window.React.createElement(
          'div',
          {
            style: {
              alignSelf: 'flex-start',
              opacity: 0.5,
              fontSize: 12,
              padding: '4px 10px',
            },
          },
          '...'
        ),
      window.React.createElement('div', { ref: bottomRef })
    ),
    window.React.createElement(
      'div',
      { style: { display: 'flex', gap: 8 } },
      window.React.createElement('textarea', {
        value: input,
        onChange: (e) => setInput(e.target.value),
        onKeyDown: handleKeyDown,
        placeholder: 'Ask Ollama…',
        rows: 2,
        style: {
          flex: 1,
          resize: 'none',
          padding: '6px 10px',
          borderRadius: 8,
          fontSize: 13,
        },
      }),
      window.React.createElement(
        'button',
        {
          onClick: handleSend,
          disabled: loading || !input.trim(),
          style: { padding: '0 14px', borderRadius: 8, cursor: 'pointer' },
        },
        'Send'
      )
    )
  )
}
