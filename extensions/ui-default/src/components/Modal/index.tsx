import type { UiChild } from '../../types'
import { h } from '../../h'
import { host } from '../../host'
import './nuxy-modal.ts'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: UiChild
  children: UiChild
  footer?: UiChild
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className,
}: ModalProps): HTMLElement {
  const isStringTitle = typeof title === 'string'
  return host(
    'nuxy-modal',
    {
      size,
      class: className,
      ...(isOpen ? { open: '' } : {}),
      ...(isStringTitle && title ? { title: String(title) } : {}),
    },
    { 'nuxy-modal-close': () => onClose() },
    !isStringTitle && title ? h('span', { 'data-title': '', hidden: true }, title) : null,
    h('div', { 'data-body': '' }, children),
    footer ? h('div', { 'data-footer': '' }, footer) : null
  )
}
