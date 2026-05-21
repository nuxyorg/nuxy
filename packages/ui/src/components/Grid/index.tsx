import React from 'react'
import './index.css'

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: number
  gap?: number
}

export interface GridItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  title?: string
}

export function Grid({ cols = 9, gap = 4, className, style, children, ...rest }: GridProps) {
  return (
    <div
      className={`nuxy-grid ${className ?? ''}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: `${gap}px`,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}

export function GridItem({ active, className, children, ...rest }: GridItemProps) {
  return (
    <button
      className={`nuxy-grid-item ${active ? 'nuxy-grid-item--active' : ''} ${className ?? ''}`}
      {...rest}
    >
      {children}
    </button>
  )
}
