
export interface PaginationProps {
  total: number // total items
  current: number // 1-indexed current page
  pageSize?: number
  onChange: (page: number) => void
  siblings?: number
  className?: string
}

export function Pagination(...args: any[]): unknown {
  return (window.UI as any)?.Pagination?.(...args) ?? null
}
