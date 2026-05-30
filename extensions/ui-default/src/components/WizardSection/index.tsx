import React from 'react'
import './index.css'

export interface WizardSectionProps {
  icon?: React.ReactNode
  title: string
}

export function WizardSection({ icon, title }: WizardSectionProps) {
  return (
    <div className="nuxy-wizard-section">
      {icon && <span className="nuxy-wizard-section__icon">{icon}</span>}
      <h2 className="nuxy-wizard-section__title">{title}</h2>
    </div>
  )
}
