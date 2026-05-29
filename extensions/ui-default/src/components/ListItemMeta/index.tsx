import React from 'react'
import './index.css'

export type ListItemMetaProps = React.HTMLAttributes<HTMLDivElement>

export function ListItemMeta({ children, className, ...props }: ListItemMetaProps) {
  return (
    <div className={`nuxy-list-item-meta ${className || ''}`} {...props}>
      <span className="nuxy-list-item-meta__text">{children}</span>
    </div>
  )
}
