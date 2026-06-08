import { h } from '../../h'
import './nuxy-spinner.ts'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | number
  className?: string
  'aria-label'?: string
}

export function Spinner({
  size = 'md',
  className,
  'aria-label': ariaLabel = 'Loading…',
}: SpinnerProps) {
  return h('nuxy-spinner', {
    size: typeof size === 'number' ? String(size) : size,
    class: className,
    'aria-label': ariaLabel,
  })
}
