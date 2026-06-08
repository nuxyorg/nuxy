import { h } from '../../h'
import { host, setRef } from '../../host'
import './nuxy-grid.ts'

export interface GridProps extends Record<string, unknown> {
  cols?: number
  gap?: number
  className?: string
  style?: Record<string, string | number>
  children?: unknown
}

export interface GridItemProps extends Record<string, unknown> {
  active?: boolean
  title?: string
  className?: string
  children?: unknown
  tabIndex?: number
}

export function Grid({
  cols = 9,
  gap = 4,
  className,
  style,
  children,
  ref,
  ...rest
}: GridProps & { ref?: unknown }): HTMLElement {
  const el = h(
    'nuxy-grid',
    {
      ...rest,
      class: className,
      cols: String(cols),
      gap: String(gap),
      style,
    },
    children
  )
  if (ref) setRef(ref, el)
  return el
}

export function GridItem({
  active,
  className,
  children,
  title,
  tabIndex,
  ref,
  ...rest
}: GridItemProps & { ref?: unknown }): HTMLElement {
  const el = h(
    'nuxy-grid-item',
    {
      ...rest,
      class: className,
      ...(active ? { active: '' } : {}),
      ...(title ? { title } : {}),
      ...(tabIndex !== undefined ? { tabindex: String(tabIndex) } : {}),
    },
    children
  )
  if (ref) {
    queueMicrotask(() => {
      const button = el.querySelector('button')
      setRef(ref, button)
    })
  }
  return el
}
