import type { UiChild } from '../../types'
import { h } from '../../h'
import { host } from '../../host'
import './nuxy-tooltip.ts'

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

export interface TooltipProps {
  content: UiChild
  children: UiChild
  placement?: TooltipPlacement
  className?: string
}

export function Tooltip({
  content,
  children,
  placement = 'top',
  className,
}: TooltipProps): HTMLElement {
  return h(
    'nuxy-tooltip',
    {
      class: className,
      content: String(content),
      placement,
    },
    children
  )
}
