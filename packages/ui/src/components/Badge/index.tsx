import React from 'react'
import './index.css'

export function Badge({ children, active, className, ...props }: any) {
  return (
    <span
      className={`nuxy-badge ${active ? 'nuxy-badge--active' : 'nuxy-badge--inactive'} ${className || ''}`}
      {...props}
    >
      {children}
    </span>
  )
}
