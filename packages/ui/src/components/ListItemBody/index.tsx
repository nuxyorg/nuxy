import React from 'react'

export function ListItemBody({ children, className, ...props }: any) {
  return (
    <div
      className={`flex flex-col gap-0.5 flex-1 min-w-0 pr-2 ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  )
}
