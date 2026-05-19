import React from 'react'
import './index.css'

export function ShortcutHint({ children, className, ...props }: any) {
  return (
    <div className={`nuxy-shortcut-hint ${className || ''}`} {...props}>
      {children}
    </div>
  )
}

export function ShortcutSep() {
  return <span className="nuxy-shortcut-sep">/</span>
}
