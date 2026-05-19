import React from 'react'
import './index.css'

export function ShortcutBar({ children, className, ...props }: any) {
  return (
    <div className={`nuxy-shortcut-bar ${className || ''}`} {...props}>
      {children}
    </div>
  )
}
