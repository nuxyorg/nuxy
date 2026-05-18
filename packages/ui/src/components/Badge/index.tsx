import React from 'react'

export function Badge({ children, active, className, ...props }: any) {
  return (
    <span
      className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors duration-150 ${
        active
          ? 'text-syntax-constant bg-bg-base border-syntax-operator'
          : 'text-syntax-peach bg-syntax-comment border-transparent'
      } ${className || ''}`}
      {...props}
    >
      {children}
    </span>
  )
}
