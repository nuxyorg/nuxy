const React = window.React

interface Props {
  message: string | null
}

export function ProcessAlert({ message }: Props) {
  const { Alert } = window.UI || {}

  if (!message) return null

  if (Alert) {
    return <Alert variant="error">{message}</Alert>
  }

  return (
    <div
      style={{
        padding: 'var(--space-3) var(--space-5)',
        fontSize: 'var(--font-sm)',
        color: 'var(--color-danger)',
        background: 'var(--color-danger-bg)',
        borderBottom: 'var(--space-px) solid var(--color-danger-border)',
      }}
    >
      {message}
    </div>
  )
}
