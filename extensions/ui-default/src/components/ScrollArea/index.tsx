import { h } from '../../h'
import './nuxy-scroll-area.ts'

export interface ScrollAreaProps extends Record<string, unknown> {
  axis?: 'both' | 'y' | 'x'
  maxHeight?: number | string
  maxWidth?: number | string
  className?: string
  style?: Record<string, string | number>
  children?: unknown
}

export function ScrollArea({
  axis = 'y',
  maxHeight,
  maxWidth,
  className,
  style,
  children,
  ref,
  ...props
}: ScrollAreaProps & { ref?: unknown }): HTMLElement {
  return h(
    'nuxy-scroll-area',
    {
      ...props,
      ref,
      class: className,
      axis,
      ...(maxHeight !== undefined
        ? { 'max-height': typeof maxHeight === 'number' ? String(maxHeight) : maxHeight }
        : {}),
      ...(maxWidth !== undefined
        ? { 'max-width': typeof maxWidth === 'number' ? String(maxWidth) : maxWidth }
        : {}),
      style,
    },
    children
  )
}
