import React from 'react'

const maxHeightStyles: Record<string, string> = {
  md: 'max-h-[320px]'
}

export function List({ children, className, maxHeight, ...props }: any) {
  const heightClass = maxHeight ? maxHeightStyles[maxHeight] || '' : ''
  return (
    <div
      className={`flex flex-col gap-0 overflow-y-auto custom-scrollbar ${heightClass} ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  )
}
