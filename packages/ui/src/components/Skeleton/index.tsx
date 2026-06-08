
export interface SkeletonProps extends Record<string, unknown> {
  width?: number | string
  height?: number | string
  variant?: 'rect' | 'text' | 'circle'
}

export function Skeleton(...args: any[]): unknown {
  return (window.UI as any)?.Skeleton?.(...args) ?? null
}
