const React = window.React

interface Params {
  query: string
  loading: boolean
  models: string[]
  handleSend: (overrideText?: string) => Promise<void>
  handleQueue: (text: string) => void
  handleAbort: () => void
  handleClearChat: () => void
  setSelectedModel: (model: string) => void
  t: (key: string) => string
}

export function useOllamaKeyboard({
  query,
  loading,
  models,
  handleSend,
  handleQueue,
  handleAbort,
  handleClearChat,
  setSelectedModel,
  t,
}: Params): void {
  const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

  _useToolKeyActions([
    {
      key: 'Enter',
      label: loading && query.trim().length > 0 ? t('actions.queue') : t('actions.send'),
      hint: '↵',
      activeOn: () => query.trim().length > 0,
      handler: () => {
        const text = query.trim()
        if (!text) return
        if (loading) {
          handleQueue(text)
        } else {
          void handleSend()
        }
      },
    },
    {
      key: 'Escape',
      label: t('actions.stop'),
      hint: 'Esc',
      activeOn: () => loading,
      handler: () => {
        handleAbort()
      },
    },
  ])

  React.useEffect(() => {
    const actions: {
      id: string
      label: string
      onExecute?: () => void
      children?: { id: string; label: string; onExecute: () => void }[]
    }[] = [
      {
        id: 'ollama-clear-chat',
        label: t('actions.clearHistory'),
        onExecute: handleClearChat,
      },
    ]
    if (models.length > 0) {
      actions.push({
        id: 'ollama-models',
        label: t('actions.models'),
        children: models.map((m) => ({
          id: `ollama-select-model-${m}`,
          label: m,
          onExecute: () => setSelectedModel(m),
        })),
      })
    }
    window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: actions }))
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: [] }))
    }
  }, [models, t])
}
