import React from 'react'

export interface PropertyRow {
  label: string
  value: React.ReactNode
}

export interface PropertiesPanelProps {
  title?: string
  rows: PropertyRow[]
}

export function PropertiesPanel(props: PropertiesPanelProps): React.ReactElement {
  const Impl = (window.UI as any)?.PropertiesPanel || (() => null)
  return <Impl {...props} />
}
