import { h } from '../../h'
import './nuxy-skeleton.ts'

export interface SkeletonProps extends Record<string, unknown> {
  width?: number | string
  height?: number | string
  variant?: 'rect' | 'text' | 'circle'
}

export function Skeleton({
  width,
  height,
  variant = 'rect',
  className,
  style,
  ...props
}: SkeletonProps) {
  return h('nuxy-skeleton', {
    ...props,
    class: className,
    variant,
    ...(width !== undefined ? { width: typeof width === 'number' ? String(width) : width } : {}),
    ...(height !== undefined
      ? { height: typeof height === 'number' ? String(height) : height }
      : {}),
    style,
  })
}
