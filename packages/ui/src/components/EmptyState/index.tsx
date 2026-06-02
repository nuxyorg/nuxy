import React from 'react'

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode
  message?: React.ReactNode
  hint?: React.ReactNode
  error?: React.ReactNode
  page?: boolean
}

export function EmptyState(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.EmptyState
  if (Impl) {
    return <Impl {...props} />
  }

  const { title, message, hint, error, page, children, style, ...rest } = props
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    textAlign: 'center',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: 'var(--text-muted, #a1a1aa)',
    minHeight: page ? '100vh' : 'auto',
    backgroundColor: page ? 'var(--surface-1, #09090b)' : 'transparent',
    boxSizing: 'border-box',
    ...style,
  }

  return (
    <div style={containerStyle} {...rest}>
      {title && (
        <h2
          style={{
            fontSize: 'var(--font-lg, 18px)',
            fontWeight: 600,
            color: 'var(--text-primary, #f4f4f5)',
            margin: '0 0 8px 0',
          }}
        >
          {title}
        </h2>
      )}
      {message && (
        <p
          style={{
            fontSize: 'var(--font-sm, 14px)',
            margin: '0 0 8px 0',
            color: 'var(--text-muted, #a1a1aa)',
          }}
        >
          {message}
        </p>
      )}
      {hint && (
        <p
          style={{
            fontSize: 'var(--font-xs, 12px)',
            margin: '0 0 8px 0',
            color: 'var(--text-subtle, #71717a)',
          }}
        >
          {hint}
        </p>
      )}
      {error && (
        <pre
          style={{
            fontSize: 'var(--font-xs, 12px)',
            padding: '12px',
            background: 'var(--surface-2, #27272a)',
            borderRadius: 'var(--radius, 6px)',
            color: 'var(--error, #ef4444)',
            margin: '8px 0 0 0',
            overflowX: 'auto',
            maxWidth: '100%',
            textAlign: 'left',
          }}
        >
          {String(error)}
        </pre>
      )}
      {children}
    </div>
  )
}
