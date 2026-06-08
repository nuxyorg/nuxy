import { h } from '../../h'
import './nuxy-list.ts'

export interface ListProps extends Record<string, unknown> {
  maxHeight?: 'md'
}

export function List({ children, className, maxHeight, ...props }: ListProps) {
  return h(
    'nuxy-list',
    {
      ...props,
      class: className,
      ...(maxHeight ? { 'max-height': maxHeight } : {}),
    },
    children
  )
}
