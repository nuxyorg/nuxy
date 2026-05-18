import React from 'react'

export function ListItemActions({ children, className, ...props }: any) {
  return (
    <div
      className={`flex items-center gap-1 flex-shrink-0 ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  )
}
