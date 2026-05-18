import React from 'react'

export function ShortcutBar({ children, className, ...props }: any) {
  return (
    <div
      className={`flex items-center justify-center gap-4 px-4 py-2.5 border-t border-syntax-comment ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  )
}
