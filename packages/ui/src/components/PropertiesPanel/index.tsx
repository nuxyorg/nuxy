
export interface PropertyRow {
  label: string
  value: unknown
}

export interface PropertiesPanelProps {
  title?: string
  rows: PropertyRow[]
}

export function PropertiesPanel(...args: any[]): unknown {
  return (window.UI as any)?.PropertiesPanel?.(...args) ?? null
}
