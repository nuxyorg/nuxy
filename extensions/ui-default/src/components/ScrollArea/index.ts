export interface ScrollAreaProps extends Record<string, unknown> {
  axis?: 'both' | 'y' | 'x'
  maxHeight?: number | string
  maxWidth?: number | string
  className?: string
  style?: Record<string, string | number>
  children?: unknown
}
