import React from 'react'
import './index.css'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'danger' | 'warning' | 'info' | 'success'
}

export function Alert({ variant = 'info', className, children, ...props }: AlertProps) {
  const rootClass = ['nuxy-alert', `nuxy-alert--${variant}`, className || '']
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rootClass} {...props}>
      {children}
    </div>
  )
}
