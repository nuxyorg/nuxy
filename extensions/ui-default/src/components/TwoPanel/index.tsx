import type { UiChild } from '../../types'
import { h } from '../../h'
import './nuxy-two-panel.ts'

export interface TwoPanelProps extends Record<string, unknown> {
  left: UiChild
  right: UiChild
  split?: string
}

export function TwoPanel({ left, right, split = '50%', className, ...rest }: TwoPanelProps) {
  return h(
    'nuxy-two-panel',
    {
      ...rest,
      class: className,
      split,
    },
    left,
    right
  )
}
