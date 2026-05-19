import React from 'react'
import './index.css'

export type ListItemActionsProps = React.HTMLAttributes<HTMLDivElement>

export function ListItemActions({ children, className, ...props }: ListItemActionsProps) {
  return (
    <div className={`nuxy-list-item-actions ${className || ''}`} {...props}>
      {children}
    </div>
  )
}
