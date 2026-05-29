import React from 'react'
import './index.css'

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  axis?: 'both' | 'y' | 'x'
  maxHeight?: number | string
  maxWidth?: number | string
}

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ axis = 'y', maxHeight, maxWidth, className, style, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`nuxy-scroll-area ${axis !== 'both' ? `nuxy-scroll-area--${axis}` : ''} ${className || ''}`}
        style={{
          maxHeight: maxHeight !== undefined ? (typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight) : undefined,
          maxWidth: maxWidth !== undefined ? (typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth) : undefined,
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    )
  }
)
ScrollArea.displayName = 'ScrollArea'
