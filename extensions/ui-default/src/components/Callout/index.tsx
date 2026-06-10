import type { UiChild } from '../../types'
import { h } from '../../h'
import './nuxy-callout.ts'

export interface CalloutProps {
  variant?: 'info' | 'warning' | 'error' | 'success'
  title?: string
  children: UiChild
  icon?: UiChild
  className?: string
}

export function Callout({ variant = 'info', title, children, icon, className }: CalloutProps) {
  if (icon) {
    return h(
      'nuxy-callout',
      { class: className, variant, ...(title ? { title } : {}) },
      h('span', { slot: 'icon' }, icon),
      children
    )
  }

  return h('nuxy-callout', { class: className, variant, ...(title ? { title } : {}) }, children)
}
