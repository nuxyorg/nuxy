import React from 'react'
import './index.css'

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return <input ref={ref} className={`nuxy-input ${className || ''}`} {...props} />
})
Input.displayName = 'Input'
