import React from 'react'
import './index.css'

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  description?: string
}

export function SectionHeader({ label, description, className, ...rest }: SectionHeaderProps) {
  return (
    <div className={`nuxy-section-header ${className ?? ''}`} {...rest}>
      <span className="nuxy-section-header__label">{label}</span>
      {description && <span className="nuxy-section-header__desc">{description}</span>}
    </div>
  )
}
