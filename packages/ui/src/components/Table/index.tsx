
export interface TableProps extends Record<string, unknown> {
  containerClassName?: string
}

export interface TableRowProps extends Record<string, unknown> {
  interactive?: boolean
}

export interface TableCellProps extends Record<string, unknown> {
  header?: boolean
}

/* DataList */
export interface DataListItem {
  label: unknown
  value: unknown
}

export interface DataListProps {
  items: DataListItem[]
  className?: string
}

/* Stat / Metric */
export interface StatProps {
  label: string
  value: string | number
  change?: number // percentage e.g. 12 or -5
  helpText?: string
  className?: string
}

export function Table(...args: any[]): unknown {
  return (window.UI as any)?.Table?.(...args) ?? null
}

export function TableRow(...args: any[]): unknown {
  return (window.UI as any)?.TableRow?.(...args) ?? null
}

export function TableCell(...args: any[]): unknown {
  return (window.UI as any)?.TableCell?.(...args) ?? null
}

export function DataList(...args: any[]): unknown {
  return (window.UI as any)?.DataList?.(...args) ?? null
}

export function Stat(...args: any[]): unknown {
  return (window.UI as any)?.Stat?.(...args) ?? null
}
