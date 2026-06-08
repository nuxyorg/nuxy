import { h } from '../../h'
import './nuxy-list-item-actions.ts'

export type ListItemActionsProps = HTMLAttributes<HTMLDivElement>

export function ListItemActions({ children, className, ...props }: ListItemActionsProps) {
  return h('nuxy-list-item-actions', { ...props, class: className }, children)
}
