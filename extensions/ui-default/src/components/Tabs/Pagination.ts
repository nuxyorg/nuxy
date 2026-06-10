export interface PaginationProps {
  total: number
  current: number
  pageSize?: number
  onChange: (page: number) => void
  siblings?: number
  className?: string
}
