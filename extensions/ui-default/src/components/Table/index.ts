export interface TableProps extends Record<string, unknown> {
  containerClassName?: string
}
export interface TableRowProps extends Record<string, unknown> {
  interactive?: boolean
}
export interface TableCellProps extends Record<string, unknown> {
  header?: boolean
}
export interface DataListItem {
  label: unknown
  value: unknown
}
export interface DataListProps {
  items: DataListItem[]
  className?: string
}
export interface StatProps {
  label: string
  value: string | number
  change?: number
  helpText?: string
  className?: string
}
