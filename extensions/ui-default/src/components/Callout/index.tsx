import React from 'react'
import '../ProgressBar/index.css'

const ICONS: Record<string, React.ReactNode> = {
  info: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--syntax-operator)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  warning: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--syntax-constant)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--syntax-invalid)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  success: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--syntax-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="20 6 9 17 4 12" />
    </svg>
  ),
}

export interface CalloutProps {
  variant?: 'info' | 'warning' | 'error' | 'success'
  title?: string
  children: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

export function Callout({ variant = 'info', title, children, icon, className }: CalloutProps) {
  return (
    <div className={`nuxy-callout nuxy-callout--${variant} ${className || ''}`} role={variant === 'error' ? 'alert' : undefined}>
      <span className="nuxy-callout__icon">{icon ?? ICONS[variant]}</span>
      <div className="nuxy-callout__body">
        {title && <div className="nuxy-callout__title">{title}</div>}
        <div className="nuxy-callout__message">{children}</div>
      </div>
    </div>
  )
}
