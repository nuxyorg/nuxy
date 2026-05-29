import React from 'react'
import './index.css'

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export function Label({ children, required, className, ...props }: LabelProps) {
  return (
    <label
      className={`nuxy-label ${required ? 'nuxy-label--required' : ''} ${className || ''}`}
      {...props}
    >
      {children}
    </label>
  )
}

export interface HelperTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'error' | 'success'
}

export function HelperText({
  children,
  variant = 'default',
  className,
  ...props
}: HelperTextProps) {
  return (
    <span
      className={`nuxy-helper-text ${variant !== 'default' ? `nuxy-helper-text--${variant}` : ''} ${className || ''}`}
      {...props}
    >
      {children}
    </span>
  )
}
