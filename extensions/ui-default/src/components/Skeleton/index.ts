export interface SkeletonProps extends Record<string, unknown> {
  width?: number | string
  height?: number | string
  variant?: 'rect' | 'text' | 'circle'
}
