import React from 'react'
import './index.css'

export type ListItemBodyProps = React.HTMLAttributes<HTMLDivElement>

export function ListItemBody({ children, className, ...props }: ListItemBodyProps) {
  return (
    <div className={`nuxy-list-item-body ${className || ''}`} {...props}>
      {children}
    </div>
  )
}
