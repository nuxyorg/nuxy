
export interface LoadingStateProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  minHeight?: string
  className?: string
}

export function LoadingState(...args: any[]): unknown {
  return (window.UI as any)?.LoadingState?.(...args) ?? null
}
