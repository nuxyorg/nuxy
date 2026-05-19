import React from 'react'
import './index.css'

export function ListItem({ children, active, className, ...props }: any) {
  return (
    <div
      className={`nuxy-list-item ${active ? 'nuxy-list-item--active' : ''} ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  )
}
