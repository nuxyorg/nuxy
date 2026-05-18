import React from 'react'

export function Kbd({ children, className, ...props }: any) {
  return (
    <kbd
      className={`px-1.5 py-0.5 rounded bg-syntax-comment border border-syntax-keyword font-mono text-[10px] text-syntax-variable ${className || ''}`}
      {...props}
    >
      {children}
    </kbd>
  )
}
