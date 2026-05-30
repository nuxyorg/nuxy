import React from 'react'
import './index.css'

export interface PropertyRow {
  label: string
  value: React.ReactNode
}

export interface PropertiesPanelProps {
  title?: string
  rows: PropertyRow[]
}

export function PropertiesPanel({ title, rows }: PropertiesPanelProps) {
  return (
    <div className="nuxy-properties-panel">
      {title && <div className="nuxy-properties-panel__title">{title}</div>}
      <div className="nuxy-properties-panel__grid">
        {rows.map((row, i) => (
          <React.Fragment key={i}>
            <div className="nuxy-properties-panel__label">{row.label}</div>
            <div className="nuxy-properties-panel__value">{row.value}</div>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
