import React from 'react'
import './index.css'

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  description?: string
  action?: React.ReactNode
}

export const SectionHeader = React.forwardRef<HTMLDivElement, SectionHeaderProps>(
  ({ label, description, action, className, ...rest }, ref) => (
    <div ref={ref} className={`nuxy-section-header ${className ?? ''}`} {...rest}>
      <span className="nuxy-section-header__label">{label}</span>
      {description && <span className="nuxy-section-header__desc">{description}</span>}
      {action && <span className="nuxy-section-header__action">{action}</span>}
    </div>
  )
)
SectionHeader.displayName = 'SectionHeader'
