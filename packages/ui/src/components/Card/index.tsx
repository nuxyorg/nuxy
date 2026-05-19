import React from 'react'
import './index.css'

export type CardProps = React.HTMLAttributes<HTMLDivElement>

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div className={`nuxy-card ${className || ''}`} {...props}>
      {children}
    </div>
  )
}
