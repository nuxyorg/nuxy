import React from 'react'
import './index.css'

export interface TwoPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  left: React.ReactNode
  right: React.ReactNode
  split?: string
}

export function TwoPanel({ left, right, split = '50%', className, ...rest }: TwoPanelProps) {
  return (
    <div className={`nuxy-two-panel ${className ?? ''}`} {...rest}>
      <div className="nuxy-two-panel__left" style={{ width: split }}>
        {left}
      </div>
      <div className="nuxy-two-panel__right">{right}</div>
    </div>
  )
}
