import React from 'react'
import './index.css'

const variantStyles: Record<string, string> = {
  default: '',
  success: 'nuxy-list-item-text--success'
}

export function ListItemText({ children, variant = 'default', className, ...props }: any) {
  return (
    <span
      className={`nuxy-list-item-text ${variantStyles[variant] || ''} ${className || ''}`}
      {...props}
    >
      {children}
    </span>
  )
}
