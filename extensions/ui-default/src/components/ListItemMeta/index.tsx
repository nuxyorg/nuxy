import { h } from '../../h'
import './nuxy-list-item-meta.ts'

export type ListItemMetaProps = HTMLAttributes<HTMLDivElement>

export function ListItemMeta({ children, className, ...props }: ListItemMetaProps) {
  return h('nuxy-list-item-meta', { ...props, class: className }, children)
}
