import React, { useRef, useEffect } from 'react'
import './index.css'
import { smoothScrollIntoViewIfNeeded } from '../../utils/scroll'

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: number
  gap?: number
}

export interface GridItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  title?: string
}

export const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ cols = 9, gap = 4, className, style, children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
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
)
Grid.displayName = 'Grid'

export function GridItem({ active, className, children, ...rest }: GridItemProps) {
  const itemRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (active && itemRef.current) {
      smoothScrollIntoViewIfNeeded(itemRef.current)
    }
  }, [active])

  return (
    <button
      ref={itemRef}
      className={`nuxy-grid-item ${active ? 'nuxy-grid-item--active' : ''} ${className ?? ''}`}
      {...rest}
    >
      {children}
    </button>
  )
}
