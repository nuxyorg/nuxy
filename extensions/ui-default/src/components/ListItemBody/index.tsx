import { h } from '../../h'
import './nuxy-list-item-body.ts'

export type ListItemBodyProps = HTMLAttributes<HTMLDivElement>

export function ListItemBody({ children, className, ...props }: ListItemBodyProps) {
  return h('nuxy-list-item-body', { ...props, class: className }, children)
}
