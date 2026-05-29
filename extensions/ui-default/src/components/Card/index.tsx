import React from 'react'
import './index.css'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

export function Card({ children, className, interactive, ...props }: CardProps) {
  return (
    <div
      className={['nuxy-card', interactive ? 'nuxy-card--interactive' : '', className || '']
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
export function CardHeader({ children, className, ...props }: CardHeaderProps) {
  return (
    <div className={`nuxy-card__header ${className || ''}`} {...props}>
      {children}
    </div>
  )
}

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}
export function CardBody({ children, className, ...props }: CardBodyProps) {
  return (
    <div className={`nuxy-card__body ${className || ''}`} {...props}>
      {children}
    </div>
  )
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}
export function CardFooter({ children, className, ...props }: CardFooterProps) {
  return (
    <div className={`nuxy-card__footer ${className || ''}`} {...props}>
      {children}
    </div>
  )
}
