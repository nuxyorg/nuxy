import React from 'react'

export function List({ children, className, ...props }: any) {
  return (
    <div
      className={`flex flex-col gap-0 overflow-y-auto custom-scrollbar ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  )
}
