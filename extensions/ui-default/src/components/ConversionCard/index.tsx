import React from 'react'
import './index.css'

export interface ConversionCardProps {
  from: React.ReactNode
  to: React.ReactNode
  label?: string
}

export function ConversionCard({ from, to, label }: ConversionCardProps) {
  return (
    <div className="nuxy-conversion-card">
      {label && <div className="nuxy-conversion-card__label">{label}</div>}
      <div className="nuxy-conversion-card__body">
        <div className="nuxy-conversion-card__panel nuxy-conversion-card__panel--from">{from}</div>
        <div className="nuxy-conversion-card__arrow">→</div>
        <div className="nuxy-conversion-card__panel nuxy-conversion-card__panel--to">{to}</div>
      </div>
    </div>
  )
}
