import type { UiChild } from '../../types'
import { h } from '../../h'
import './nuxy-aspect-ratio.ts'

export interface AspectRatioProps extends Record<string, unknown> {
  ratio?: number
  children: UiChild
}

export function AspectRatio({ ratio = 1, className, style, children, ...props }: AspectRatioProps) {
  return h(
    'nuxy-aspect-ratio',
    {
      ...props,
      ratio: String(ratio),
      class: className,
      style,
    },
    children
  )
}
