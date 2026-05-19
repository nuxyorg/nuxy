import React from 'react'
import './index.css'

export function Kbd({ children, className, ...props }: any) {
  return (
    <kbd className={`nuxy-kbd ${className || ''}`} {...props}>
      {children}
    </kbd>
  )
}
