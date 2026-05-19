import React from 'react'
import './index.css'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  active?: boolean
}

export function Badge({ children, active, className, ...props }: BadgeProps) {
  return (
    <span
      className={`nuxy-badge ${active ? 'nuxy-badge--active' : 'nuxy-badge--inactive'} ${className || ''}`}
      {...props}
    >
      {children}
    </span>
  )
}
