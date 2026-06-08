import type { UiChild } from '../../types'
import { h } from '../../h'
import './nuxy-visually-hidden.ts'

export interface VisuallyHiddenProps {
  children: UiChild
}

export function VisuallyHidden({ children }: VisuallyHiddenProps) {
  return h('nuxy-visually-hidden', null, children)
}
