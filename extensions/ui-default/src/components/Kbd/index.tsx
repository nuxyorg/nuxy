import { h } from '../../h'
import './nuxy-kbd.ts'

export type KbdProps = HTMLAttributes<HTMLElement>

export function Kbd({ children, className, ...props }: KbdProps) {
  if (typeof children === 'string') {
    return h('nuxy-kbd', { ...props, class: className, keys: children })
  }
  return h('kbd', { ...props, class: `nuxy-kbd ${className || ''}` }, children)
}
