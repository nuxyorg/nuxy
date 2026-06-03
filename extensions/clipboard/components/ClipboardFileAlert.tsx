const React = window.React

interface Props {
  fileExists: boolean | null
}

export function ClipboardFileAlert({ fileExists }: Props) {
  if (fileExists !== false) return null

  const { Alert } = window.UI || {}

  return Alert ? (
    <Alert variant="danger" style={{ borderRadius: 0 }}>
      File not found — it may have been moved or deleted.
    </Alert>
  ) : (
    <div
      style={{
        padding: 'var(--space-3) var(--space-5)',
        fontSize: 'var(--font-sm)',
        color: 'var(--color-danger, #e55)',
        background: 'var(--color-danger-bg, rgba(220, 50, 50, 0.08))',
        borderTop: 'var(--space-px) solid var(--color-danger-border, rgba(220, 50, 50, 0.2))',
      }}
    >
      File not found — it may have been moved or deleted.
    </div>
  )
}
