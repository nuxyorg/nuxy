import { h } from '../../h'
import './nuxy-list-item-text.ts'

export interface ListItemTextProps extends Record<string, unknown> {
  variant?: 'default' | 'success'
}

export function ListItemText({
  children,
  variant = 'default',
  className,
  ...props
}: ListItemTextProps) {
  return h(
    'nuxy-list-item-text',
    {
      ...props,
      class: className,
      variant,
    },
    children
  )
}
