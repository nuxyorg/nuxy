import { h } from '../../h'
import './nuxy-label.ts'

export interface LabelProps extends Record<string, unknown> {
  required?: boolean
}

export function Label({ children, required, className, ...props }: LabelProps) {
  return h(
    'nuxy-label',
    { ...props, class: className, ...(required ? { required: '' } : {}) },
    children
  )
}

export interface HelperTextProps extends Record<string, unknown> {
  variant?: 'default' | 'error' | 'success'
}

export function HelperText({
  children,
  variant = 'default',
  className,
  ...props
}: HelperTextProps) {
  return h(
    'nuxy-helper-text',
    {
      ...props,
      class: className,
      ...(variant !== 'default' ? { variant } : {}),
    },
    children
  )
}
