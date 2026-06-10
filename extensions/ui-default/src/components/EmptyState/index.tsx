import type { UiChild } from '../../types'
import { h } from '../../h'
import './nuxy-empty-state.ts'

export interface EmptyStateProps extends Record<string, unknown> {
  title?: UiChild
  message?: UiChild
  hint?: UiChild
  error?: UiChild
  page?: boolean
}

function nodeToAttr(value: UiChild): string | undefined {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined
}

export function EmptyState({
  title,
  message,
  hint,
  error,
  page,
  className,
  children,
  ...props
}: EmptyStateProps) {
  const extras: UiChild[] = []
  if (title != null && nodeToAttr(title) === undefined) {
    extras.push(h('h2', { class: 'nuxy-empty-state__title' }, title))
  }
  if (message != null && nodeToAttr(message) === undefined) {
    extras.push(h('p', { class: 'nuxy-empty-state__message' }, message))
  }
  if (hint != null && nodeToAttr(hint) === undefined) {
    extras.push(h('p', { class: 'nuxy-empty-state__hint' }, hint))
  }
  if (error != null && nodeToAttr(error) === undefined) {
    extras.push(h('p', { class: 'nuxy-empty-state__error' }, error))
  }

  return h(
    'nuxy-empty-state',
    {
      ...props,
      class: className,
      ...(page ? { page: '' } : {}),
      ...(nodeToAttr(title) !== undefined ? { title: nodeToAttr(title) } : {}),
      ...(nodeToAttr(message) !== undefined ? { message: nodeToAttr(message) } : {}),
      ...(nodeToAttr(hint) !== undefined ? { hint: nodeToAttr(hint) } : {}),
      ...(nodeToAttr(error) !== undefined ? { error: nodeToAttr(error) } : {}),
    },
    ...extras,
    children
  )
}
