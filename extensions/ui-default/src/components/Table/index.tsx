import React from 'react'
import './index.css'

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  containerClassName?: string
}

export function Table({ children, className, containerClassName, ...props }: TableProps) {
  return (
    <div className={`nuxy-table-container ${containerClassName || ''}`}>
      <table className={`nuxy-table ${className || ''}`} {...props}>
        {children}
      </table>
    </div>
  )
}

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  interactive?: boolean
}

export function TableRow({ children, className, interactive, ...props }: TableRowProps) {
  return (
    <tr
      className={[
        'nuxy-table__tr',
        interactive ? 'nuxy-table__tr--interactive' : '',
        className || '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </tr>
  )
}

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  header?: boolean
}

export function TableCell({ children, className, header, ...props }: TableCellProps) {
  if (header) {
    return (
      <th className={`nuxy-table__th ${className || ''}`} {...props}>
        {children}
      </th>
    )
  }
  return (
    <td className={`nuxy-table__td ${className || ''}`} {...props}>
      {children}
    </td>
  )
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

export function DataList({ items, className }: DataListProps) {
  return (
    <div className={`nuxy-data-list ${className || ''}`}>
      {items.map((item, idx) => (
        <div key={idx} className="nuxy-data-list__item">
          <span className="nuxy-data-list__label">{item.label}</span>
          <span className="nuxy-data-list__value">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

/* Stat / Metric */
export interface StatProps {
  label: string
  value: string | number
  change?: number // percentage e.g. 12 or -5
  helpText?: string
  className?: string
}

export function Stat({ label, value, change, helpText, className }: StatProps) {
  const isUp = change !== undefined && change > 0
  const isDown = change !== undefined && change < 0

  return (
    <div className={`nuxy-stat ${className || ''}`}>
      <span className="nuxy-stat__label">{label}</span>
      <span className="nuxy-stat__value">{value}</span>
      {(change !== undefined || helpText) && (
        <span
          className={[
            'nuxy-stat__help',
            isUp ? 'nuxy-stat__help--up' : '',
            isDown ? 'nuxy-stat__help--down' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {change !== undefined && (
            <span>
              {isUp ? '↑' : isDown ? '↓' : ''} {Math.abs(change)}%
            </span>
          )}
          {helpText && <span>{helpText}</span>}
        </span>
      )}
    </div>
  )
}
