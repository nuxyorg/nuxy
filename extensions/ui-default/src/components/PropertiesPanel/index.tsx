import { h } from '../../h'
import './nuxy-properties-panel.ts'

export interface PropertyRow {
  label: string
  value: string
}

export interface PropertiesPanelProps {
  title?: string
  rows: PropertyRow[]
}

export function PropertiesPanel({ title, rows }: PropertiesPanelProps): HTMLElement {
  const rowsJson = JSON.stringify(rows)
  return h('nuxy-properties-panel', {
    ...(title ? { title } : {}),
    rows: rowsJson,
  })
}
