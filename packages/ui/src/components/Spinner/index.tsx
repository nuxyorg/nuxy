
export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | number
  className?: string
  'aria-label'?: string
}

export function Spinner(...args: any[]): unknown {
  return (window.UI as any)?.Spinner?.(...args) ?? null
}
