import React from 'react'

export function Card({ children, className, ...props }: any) {
  return (
    <div
      className={`bg-bg-base border border-syntax-comment rounded-xl shadow-2xl p-4 transition-all duration-300 ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  )
}
