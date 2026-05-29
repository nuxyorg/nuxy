import React from 'react'
import './index.css'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: string
}

export function Button({ children, className, variant, ...props }: ButtonProps) {
  const variantClass = variant ? `nuxy-button--${variant}` : 'nuxy-button--default'
  return (
    <button className={`nuxy-button ${variantClass} ${className || ''}`} {...props}>
      {children}
    </button>
  )
}
