import React from 'react'
import '../Text/index.css'

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: 'default' | 'muted'
  external?: boolean
}

export function Link({ variant = 'default', external, className, children, ...props }: LinkProps) {
  return (
    <a
      className={`nuxy-link ${variant !== 'default' ? `nuxy-link--${variant}` : ''} ${className || ''}`}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      {...props}
    >
      {children}
    </a>
  )
}
