import React from 'react'

export function ShortcutHint({ children, className, ...props }: any) {
  return (
    <div
      className={`flex items-center gap-1 text-[10px] text-syntax-keyword ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function ShortcutSep() {
  return <span className="opacity-40">/</span>
}
