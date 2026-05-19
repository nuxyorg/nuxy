import React from 'react'
import './index.css'

const maxHeightStyles: Record<string, string> = {
  md: 'nuxy-list--max-h-md'
}

export function List({ children, className, maxHeight, ...props }: any) {
  const heightClass = maxHeight ? maxHeightStyles[maxHeight] || '' : ''
  return (
    <div
      className={`nuxy-list ${heightClass} ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  )
}
