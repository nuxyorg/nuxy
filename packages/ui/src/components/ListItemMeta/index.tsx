import React from 'react'
import './index.css'

export function ListItemMeta({ children, className, ...props }: any) {
  return (
    <div className={`nuxy-list-item-meta ${className || ''}`} {...props}>
      <span className="nuxy-list-item-meta__text">{children}</span>
    </div>
  )
}
