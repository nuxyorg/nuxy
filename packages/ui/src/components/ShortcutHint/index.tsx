import React from 'react'
import './index.css'

export type ShortcutHintProps = React.HTMLAttributes<HTMLDivElement>

export function ShortcutHint({ children, className, ...props }: ShortcutHintProps) {
  return (
    <div className={`nuxy-shortcut-hint ${className || ''}`} {...props}>
      {children}
    </div>
  )
}

export function ShortcutSep() {
  return <span className="nuxy-shortcut-sep">/</span>
}
