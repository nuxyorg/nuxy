import React from 'react'

export function EmptyState({ message, hint, className, ...props }: any) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-8 text-center ${className || ''}`}
      {...props}
    >
      <p className="text-sm text-syntax-keyword font-medium">{message}</p>
      {hint && <p className="text-xs text-syntax-keyword opacity-60 mt-1">{hint}</p>}
    </div>
  )
}
