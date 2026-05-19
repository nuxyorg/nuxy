import React from 'react'
import './index.css'

export function Card({ children, className, ...props }: any) {
  return (
    <div className={`nuxy-card ${className || ''}`} {...props}>
      {children}
    </div>
  )
}
