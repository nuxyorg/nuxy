import React from 'react'

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  containerClassName?: string
}

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  interactive?: boolean
}

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  header?: boolean
}

/* DataList */
export interface DataListItem {
  label: React.ReactNode
  value: React.ReactNode
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

export function Table(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Table || (() => null)
  return <Impl {...props} />
}

export function TableRow(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.TableRow || (() => null)
  return <Impl {...props} />
}

export function TableCell(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.TableCell || (() => null)
  return <Impl {...props} />
}

export function DataList(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.DataList || (() => null)
  return <Impl {...props} />
}

export function Stat(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Stat || (() => null)
  return <Impl {...props} />
}
