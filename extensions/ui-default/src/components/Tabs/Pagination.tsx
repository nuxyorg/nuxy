import { host } from '../../host'
import './nuxy-pagination.ts'

export interface PaginationProps {
  total: number
  current: number
  pageSize?: number
  onChange: (page: number) => void
  siblings?: number
  className?: string
}

export function Pagination({
  total,
  current,
  pageSize = 10,
  onChange,
  siblings = 1,
  className,
}: PaginationProps): HTMLElement {
  return host(
    'nuxy-pagination',
    {
      total: String(total),
      current: String(current),
      'page-size': String(pageSize),
      siblings: String(siblings),
      class: className,
    },
    {
      'nuxy-pagination-change': (e) => {
        const detail = (e as CustomEvent<{ page: number }>).detail
        onChange(detail.page)
      },
    }
  )
}
