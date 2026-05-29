import React from 'react'
import './index.css'

export type ShortcutBarProps = React.HTMLAttributes<HTMLDivElement>

export function ShortcutBar({ children, className, ...props }: ShortcutBarProps) {
  return (
    <div className={`nuxy-shortcut-bar ${className || ''}`} {...props}>
      {children}
    </div>
  )
}
