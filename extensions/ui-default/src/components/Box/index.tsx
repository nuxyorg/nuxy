import { h } from '../../h'
import './nuxy-box.ts'

export interface BoxProps extends Record<string, unknown> {
  as?: string
  display?: string
  padding?: number | string
  margin?: number | string
  gap?: number | string
  flex?: string
  className?: string
  style?: Record<string, string | number>
  children?: unknown
}

export function Box({
  as: tag = 'nuxy-box',
  display,
  padding,
  margin,
  gap,
  flex,
  style,
  className,
  children,
  ...props
}: BoxProps): HTMLElement {
  const toPx = (v: number | string | undefined) =>
    v !== undefined ? (typeof v === 'number' ? `${v}px` : v) : undefined

  if (tag !== 'nuxy-box' && tag !== 'div') {
    const el = h(tag, {
      ...props,
      class: `nuxy-box ${className || ''}`.trim(),
      style: {
        display,
        padding: toPx(padding),
        margin: toPx(margin),
        gap: toPx(gap),
        flex,
        ...style,
      },
    }, children)
    return el
  }

  return h(
    'nuxy-box',
    {
      ...props,
      class: className,
      ...(display ? { display: String(display) } : {}),
      ...(padding !== undefined ? { padding: typeof padding === 'number' ? String(padding) : padding } : {}),
      ...(margin !== undefined ? { margin: typeof margin === 'number' ? String(margin) : margin } : {}),
      ...(gap !== undefined ? { gap: typeof gap === 'number' ? String(gap) : gap } : {}),
      ...(flex ? { flex: String(flex) } : {}),
      style,
    },
    children
  )
}
