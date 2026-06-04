const React = window.React

const EXT_ID = 'com.nuxy.ollama'
const _useTranslation =
  (window.UI || {}).useTranslation ||
  (() => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' as const }))

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
  const { t } = _useTranslation(EXT_ID)

  const { messages, setMessages, models, selectedModel, setSelectedModel, thinkingColor } =
    useOllamaData()

  const { loading, error, queuedMessage, handleSend, handleQueue, handleAbort, handleClearChat } =
    useOllamaActions({ query, messages, setMessages, selectedModel })

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
    t,
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
      {queuedMessage && Alert && (
        <Alert variant="info">{t('alert.queued', { message: queuedMessage })}</Alert>
      )}
      <OllamaMessageList messages={messages} loading={loading} />
    </div>
  )
}
