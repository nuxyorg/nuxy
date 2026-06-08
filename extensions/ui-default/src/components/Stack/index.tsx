import { h } from '../../h'
import './nuxy-stack.ts'

type Align = 'start' | 'center' | 'end' | 'stretch'
type Justify = 'start' | 'center' | 'end' | 'between'

export interface StackProps extends Record<string, unknown> {
  direction?: 'vertical' | 'horizontal'
  gap?: number | string
  align?: Align
  justify?: Justify
  wrap?: boolean
}

export function Stack({
  direction = 'vertical',
  gap,
  align,
  justify,
  wrap,
  className,
  style,
  children,
  ...props
}: StackProps) {
  return h(
    'nuxy-stack',
    {
      ...props,
      class: className,
      direction,
      ...(align ? { align } : {}),
      ...(justify ? { justify } : {}),
      ...(wrap ? { wrap: '' } : {}),
      ...(gap !== undefined ? { gap: typeof gap === 'number' ? String(gap) : gap } : {}),
      style,
    },
    children
  )
}
