import React from 'react'
import './index.css'

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'ghost' | 'danger'
  children: React.ReactNode
}

export function IconButton({
  size = 'md',
  variant = 'default',
  children,
  className,
  ...props
}: IconButtonProps) {
  const classes = [
    'nuxy-icon-button',
    `nuxy-icon-button--${size}`,
    variant !== 'default' ? `nuxy-icon-button--${variant}` : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}
