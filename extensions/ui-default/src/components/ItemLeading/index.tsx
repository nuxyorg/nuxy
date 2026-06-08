import { h } from '../../h'
import './nuxy-item-leading.ts'

export interface ItemLeadingProps extends Record<string, unknown> {
  color?: string
  size?: 'sm' | 'md' | 'lg'
}

export function ItemLeading({
  color,
  size = 'md',
  className,
  style,
  children,
  ...rest
}: ItemLeadingProps) {
  return h(
    'nuxy-item-leading',
    {
      ...rest,
      class: className,
      size,
      ...(color ? { color } : {}),
      style,
    },
    children
  )
}
