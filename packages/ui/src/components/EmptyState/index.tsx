import React from 'react'
import './index.css'

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode
  message?: React.ReactNode
  hint?: React.ReactNode
  error?: React.ReactNode
  page?: boolean
}

export function EmptyState({
  title,
  message,
  hint,
  error,
  page,
  className,
  children,
  ...props
}: EmptyStateProps) {
  const rootClass = ['nuxy-empty-state', page ? 'nuxy-empty-state--page' : '', className || '']
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rootClass} {...props}>
      {title && <h2 className="nuxy-empty-state__title">{title}</h2>}
      {message && <p className="nuxy-empty-state__message">{message}</p>}
      {hint && <p className="nuxy-empty-state__hint">{hint}</p>}
      {error && <p className="nuxy-empty-state__error">{error}</p>}
      {children}
    </div>
  )
}
