import React from 'react'

export function ListItem({ children, active, className, ...props }: any) {
  return (
    <div
      className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-all duration-150 border-l-2 ${
        active
          ? 'bg-syntax-comment border-syntax-operator'
          : 'border-transparent hover:bg-syntax-comment hover:border-syntax-comment'
      } ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  )
}
