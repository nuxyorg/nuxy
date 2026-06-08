import { h } from '../../h'
import './nuxy-progress-bar.ts'

export interface ProgressBarProps {
  value?: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  label?: string
  showValue?: boolean
  className?: string
}

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  label,
  showValue = false,
  className,
}: ProgressBarProps): HTMLElement {
  return h('nuxy-progress-bar', {
    class: className,
    max: String(max),
    size,
    ...(label ? { label } : {}),
    ...(showValue ? { 'show-value': '' } : {}),
    ...(value !== undefined ? { value: String(value) } : {}),
  })
}
