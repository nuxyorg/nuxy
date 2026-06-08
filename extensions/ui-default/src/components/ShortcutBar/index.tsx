import { h } from '../../h'
import './nuxy-shortcut-bar.ts'

export type ShortcutBarProps = HTMLAttributes<HTMLDivElement>

export function ShortcutBar({ children, className, ...props }: ShortcutBarProps) {
  return h('nuxy-shortcut-bar', { ...props, class: className }, children)
}
