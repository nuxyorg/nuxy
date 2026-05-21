import React from 'react'
import './index.css'

export interface ItemLeadingProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: string
  size?: 'sm' | 'md' | 'lg'
}

export function ItemLeading({ color, size = 'md', className, style, children, ...rest }: ItemLeadingProps) {
  return (
    <div
      className={`nuxy-item-leading nuxy-item-leading--${size} ${className ?? ''}`}
      style={color ? { background: color, ...style } : style}
      {...rest}
    >
      {children}
    </div>
  )
}
