import type { UiChild } from '../../types'
import { h } from '../../h'
import './nuxy-section-header.ts'

export interface SectionHeaderProps extends Record<string, unknown> {
  label: string
  description?: string
  action?: UiChild
  className?: string
}

export function SectionHeader({
  label,
  description,
  action,
  className,
  ref,
  ...rest
}: SectionHeaderProps & { ref?: unknown }): HTMLElement {
  if (action) {
    return h(
      'div',
      {
        ...rest,
        ref,
        class: `nuxy-section-header ${className ?? ''}`.trim(),
      },
      h('span', { class: 'nuxy-section-header__label' }, label),
      description ? h('span', { class: 'nuxy-section-header__desc' }, description) : null,
      h('span', { class: 'nuxy-section-header__action' }, action)
    )
  }

  return h('nuxy-section-header', {
    ...rest,
    ref,
    class: className,
    label,
    ...(description ? { description } : {}),
  })
}
