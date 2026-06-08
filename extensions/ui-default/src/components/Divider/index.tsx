import { h } from '../../h'
import './nuxy-divider.ts'

export interface DividerProps extends Record<string, unknown> {
  orientation?: 'horizontal' | 'vertical'
  label?: string
}

export function Divider({ orientation = 'horizontal', label, className, ...props }: DividerProps) {
  return h('nuxy-divider', {
    ...props,
    class: className,
    orientation,
    ...(label ? { label } : {}),
  })
}
