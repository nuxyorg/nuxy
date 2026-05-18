import React from 'react'

export function ListItemMeta({ children, className, ...props }: any) {
  return (
    <div className={`flex items-center gap-1.5 ${className || ''}`} {...props}>
      <span className="text-[10px] text-syntax-keyword">{children}</span>
    </div>
  )
}
