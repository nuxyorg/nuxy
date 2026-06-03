const React = window.React

import { useOllamaData } from './hooks/useOllamaData.ts'
import { useOllamaActions } from './hooks/useOllamaActions.ts'
import { useOllamaSync } from './hooks/useOllamaSync.ts'
import { useOllamaKeyboard } from './hooks/useOllamaKeyboard.ts'
import { OllamaMessageList } from './components/OllamaMessageList.tsx'

interface Props {
  query: string
}

export default function OllamaApp({ query }: Props) {
  const { Alert } = window.UI || {}

  const { messages, setMessages, models, selectedModel, setSelectedModel, thinkingColor } = useOllamaData()

  const {
    loading,
    error,
    queuedMessage,
    handleSend,
    handleQueue,
    handleAbort,
    handleClearChat,
  } = useOllamaActions({ query, messages, setMessages, selectedModel })

  useOllamaSync({
    query,
    loading,
    messagesLength: messages.length,
    modelsLength: models.length,
    selectedModel,
    queuedMessage,
    thinkingColor,
  })

  useOllamaKeyboard({
    query,
    loading,
    models,
    handleSend,
    handleQueue,
    handleAbort,
    handleClearChat,
    setSelectedModel,
  })

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
      {queuedMessage && Alert && <Alert variant="info">Queued: {queuedMessage}</Alert>}
      <OllamaMessageList messages={messages} loading={loading} />
    </div>
  )
}
