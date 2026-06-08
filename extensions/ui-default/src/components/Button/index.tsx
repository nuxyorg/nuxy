import { h } from '../../h'
import './nuxy-button.ts'

export interface ButtonProps extends Record<string, unknown> {
  variant?: string
}

export function Button({ children, className, variant, disabled, type, ...props }: ButtonProps) {
  return h(
    'nuxy-button',
    {
      ...props,
      class: className,
      variant: variant ?? 'default',
      ...(disabled ? { disabled: '' } : {}),
      ...(type ? { type } : {}),
    },
    children
  )
}
