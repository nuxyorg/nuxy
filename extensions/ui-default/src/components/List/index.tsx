import React from 'react'
import './index.css'

const maxHeightStyles: Record<string, string> = {
  md: 'nuxy-list--max-h-md',
}

export interface ListProps extends React.HTMLAttributes<HTMLDivElement> {
  maxHeight?: 'md'
}

export function List({ children, className, maxHeight, ...props }: ListProps) {
  const heightClass = maxHeight ? maxHeightStyles[maxHeight] || '' : ''
  return (
    <div className={`nuxy-list ${heightClass} ${className || ''}`} {...props}>
      {children}
    </div>
  )
}
