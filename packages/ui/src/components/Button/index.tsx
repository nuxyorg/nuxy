import React from 'react'
import './index.css'

export function Button({ children, className, variant, ...props }: any) {
  const variantClass = variant ? `nuxy-button--${variant}` : 'nuxy-button--default'
  return (
    <button className={`nuxy-button ${variantClass} ${className || ''}`} {...props}>
      {children}
    </button>
  )
}
