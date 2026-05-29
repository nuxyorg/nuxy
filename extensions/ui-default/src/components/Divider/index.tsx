import React from 'react'
import './index.css'

export interface DividerProps extends React.HTMLAttributes<HTMLElement> {
  orientation?: 'horizontal' | 'vertical'
  label?: string
}

export function Divider({ orientation = 'horizontal', label, className, ...props }: DividerProps) {
  if (label) {
    return (
      <div className={`nuxy-divider nuxy-divider--label ${className || ''}`} role="separator" {...props}>
        <span className="nuxy-divider__label-text">{label}</span>
      </div>
    )
  }
  if (orientation === 'vertical') {
    return <div className={`nuxy-divider nuxy-divider--vertical ${className || ''}`} role="separator" {...props} />
  }
  return <hr className={`nuxy-divider ${className || ''}`} {...props} />
}
