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

export const GridItem = React.forwardRef<HTMLButtonElement, GridItemProps>(
  ({ active, className, children, ...rest }, ref) => {
    const itemRef = useRef<HTMLButtonElement | null>(null)

    useEffect(() => {
      if (active && itemRef.current) {
        smoothScrollIntoViewIfNeeded(itemRef.current)
      }
    }, [active])

    return (
      <button
        ref={(node) => {
          itemRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node
        }}
        className={`nuxy-grid-item ${active ? 'nuxy-grid-item--active' : ''} ${className ?? ''}`}
        {...rest}
      >
        {children}
      </button>
    )
  }
)
GridItem.displayName = 'GridItem'
