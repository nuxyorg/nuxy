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
}: Params): void {
  const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

  _useToolKeyActions([
    {
      key: 'Enter',
      label: loading && query.trim().length > 0 ? 'Queue' : 'Send',
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
      label: 'Stop',
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
        label: 'Clear Chat History',
        onExecute: handleClearChat,
      },
    ]
    if (models.length > 0) {
      actions.push({
        id: 'ollama-models',
        label: 'Models',
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
  }, [models])
}
