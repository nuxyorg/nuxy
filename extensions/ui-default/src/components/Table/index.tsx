import type { UiChild } from '../../types'
import { h } from '../../h'
import './nuxy-table.ts'

export interface TableProps extends Record<string, unknown> {
  containerClassName?: string
}

export function Table({
  children,
  className,
  containerClassName,
  ...props
}: TableProps): HTMLElement {
  return h(
    'nuxy-table-container',
    {
      ...props,
      class: className,
      'container-class': containerClassName,
    },
    children
  )
}

export interface TableRowProps extends Record<string, unknown> {
  interactive?: boolean
}

export function TableRow({
  children,
  className,
  interactive,
  ...props
}: TableRowProps): HTMLElement {
  return h(
    'nuxy-table-row',
    {
      ...props,
      class: className,
      ...(interactive ? { interactive: '' } : {}),
    },
    children
  )
}

export interface TableCellProps extends Record<string, unknown> {
  header?: boolean
}

export function TableCell({ children, className, header, ...props }: TableCellProps): HTMLElement {
  return h(
    'nuxy-table-cell',
    {
      ...props,
      class: className,
      ...(header ? { header: '' } : {}),
    },
    children
  )
}

export interface DataListItem {
  label: UiChild
  value: UiChild
}

export interface DataListProps {
  items: DataListItem[]
  className?: string
}

function nodeToString(value: UiChild): string | undefined {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined
}

function itemsToJson(items: DataListItem[]): string {
  return JSON.stringify(
    items.map((item) => ({
      label: nodeToString(item.label) ?? '',
      value: nodeToString(item.value) ?? '',
    }))
  )
}

export function DataList({ items, className }: DataListProps): HTMLElement {
  return h('nuxy-data-list', {
    class: className,
    items: itemsToJson(items),
  })
}

export interface StatProps {
  label: string
  value: string | number
  change?: number
  helpText?: string
  className?: string
}

export function Stat({ label, value, change, helpText, className }: StatProps): HTMLElement {
  return h('nuxy-stat', {
    class: className,
    label,
    value: String(value),
    ...(change !== undefined ? { change: String(change) } : {}),
    ...(helpText ? { 'help-text': helpText } : {}),
  })
}
