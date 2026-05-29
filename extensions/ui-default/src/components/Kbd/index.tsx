import React from 'react'
import './index.css'

export type KbdProps = React.HTMLAttributes<HTMLElement>

export function Kbd({ children, className, ...props }: KbdProps) {
  return (
    <kbd className={`nuxy-kbd ${className || ''}`} {...props}>
      {children}
    </kbd>
  )
}
