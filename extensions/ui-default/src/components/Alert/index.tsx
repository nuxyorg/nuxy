import { h } from '../../h'
import './nuxy-alert.ts'

export interface AlertProps extends Record<string, unknown> {
  variant?: 'danger' | 'warning' | 'info' | 'success'
}

export function Alert({ variant = 'info', className, children, ...props }: AlertProps) {
  return h('nuxy-alert', { ...props, class: className, variant }, children)
}
