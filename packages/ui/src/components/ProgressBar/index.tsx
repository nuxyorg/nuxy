
export interface ProgressBarProps {
  value?: number // 0-100, omit for indeterminate
  max?: number
  size?: 'sm' | 'md' | 'lg'
  label?: string
  showValue?: boolean
  className?: string
}

export function ProgressBar(...args: any[]): unknown {
  return (window.UI as any)?.ProgressBar?.(...args) ?? null
}
