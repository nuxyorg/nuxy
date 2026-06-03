const React = window.React

interface Params {
  query: string
  loading: boolean
  messagesLength: number
  modelsLength: number
  selectedModel: string
  queuedMessage: string | null
  thinkingColor: string
}

export function useOllamaSync({
  query,
  loading,
  messagesLength,
  modelsLength,
  selectedModel,
  queuedMessage,
  thinkingColor,
}: Params): void {
  // Refresh key hints when any relevant state changes
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [query, loading, messagesLength, modelsLength, selectedModel, queuedMessage])

  // Show the active model in the footer
  React.useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('nuxy-shell-footer-hints', {
        detail: selectedModel ? React.createElement('span', null, `Model: ${selectedModel}`) : null,
      })
    )
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-shell-footer-hints', { detail: null }))
    }
  }, [selectedModel])

  // Animate the window gradient while the model is thinking
  React.useEffect(() => {
    if (loading && thinkingColor !== 'off') {
      window.dispatchEvent(
        new CustomEvent('nuxy-gradient-toggle', { detail: { active: true, mode: thinkingColor } })
      )
    } else {
      window.dispatchEvent(new CustomEvent('nuxy-gradient-toggle', { detail: false }))
    }
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-gradient-toggle', { detail: false }))
    }
  }, [loading, thinkingColor])
}
