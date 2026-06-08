import { h } from '../../h'
import './nuxy-shortcut-hint.ts'

export type ShortcutHintProps = HTMLAttributes<HTMLDivElement>

export function ShortcutHint({ children, className, ...props }: ShortcutHintProps) {
  return h('nuxy-shortcut-hint', { ...props, class: className }, children)
}

export function ShortcutSep() {
  return h('nuxy-shortcut-sep')
}
