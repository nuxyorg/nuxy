import React from 'react'
import './index.css'

export function ListItemBody({ children, className, ...props }: any) {
  return (
    <div className={`nuxy-list-item-body ${className || ''}`} {...props}>
      {children}
    </div>
  )
}
