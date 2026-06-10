export interface GridProps extends Record<string, unknown> {
  cols?: number
  gap?: number
  className?: string
  style?: Record<string, string | number>
  children?: unknown
}
export interface GridItemProps extends Record<string, unknown> {
  active?: boolean
  title?: string
  className?: string
  children?: unknown
  tabIndex?: number
}
