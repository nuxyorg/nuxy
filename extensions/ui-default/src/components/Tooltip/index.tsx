import React from 'react'
import './index.css'

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactElement
  placement?: TooltipPlacement
  className?: string
}

export function Tooltip({ content, children, placement = 'top', className }: TooltipProps) {
  const [visible, setVisible] = React.useState(false)

  return (
    <span
      className={`nuxy-tooltip-wrapper ${className || ''}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      <span
        role="tooltip"
        className={`nuxy-tooltip nuxy-tooltip--${placement} ${visible ? 'nuxy-tooltip--visible' : ''}`}
      >
        {content}
      </span>
    </span>
  )
}
