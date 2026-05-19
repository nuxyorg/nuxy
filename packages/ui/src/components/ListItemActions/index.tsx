import React from 'react'
import './index.css'

export function ListItemActions({ children, className, ...props }: any) {
  return (
    <div className={`nuxy-list-item-actions ${className || ''}`} {...props}>
      {children}
    </div>
  )
}
