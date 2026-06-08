import type { UiChild } from '../../types'
import { h } from '../../h'
import './nuxy-icon-button.ts'

export interface IconButtonProps extends Record<string, unknown> {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'ghost' | 'danger'
  children: UiChild
}

export function IconButton({
  size = 'md',
  variant = 'default',
  children,
  className,
  disabled,
  type,
  ...props
}: IconButtonProps) {
  return h(
    'nuxy-icon-button',
    {
      ...props,
      class: className,
      size,
      variant,
      ...(disabled ? { disabled: '' } : {}),
      ...(type ? { type } : {}),
    },
    children
  )
}
