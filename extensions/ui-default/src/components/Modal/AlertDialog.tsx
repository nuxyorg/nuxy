import type { UiChild } from '../../types'
import { h } from '../../h'
import { host } from '../../host'
import './nuxy-alert-dialog.ts'

export interface AlertDialogProps {
  isOpen: boolean
  onClose: () => void
  title: UiChild
  children: UiChild
  confirmLabel?: string
  cancelLabel?: string
  onConfirm?: () => void
  variant?: 'default' | 'destructive'
  className?: string
}

export function AlertDialog({
  isOpen,
  onClose,
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'default',
  className,
}: AlertDialogProps): HTMLElement {
  const isStringTitle = typeof title === 'string'
  const listeners: Record<string, EventListener> = {
    'nuxy-alert-dialog-close': () => onClose(),
  }
  if (onConfirm) {
    listeners['nuxy-alert-dialog-confirm'] = () => onConfirm()
  }
  return host(
    'nuxy-alert-dialog',
    {
      class: className,
      variant,
      'confirm-label': confirmLabel,
      'cancel-label': cancelLabel,
      ...(isOpen ? { open: '' } : {}),
      ...(isStringTitle ? { title: String(title) } : {}),
    },
    listeners,
    !isStringTitle ? h('span', { 'data-title': '', hidden: true }, title) : null,
    h('div', { 'data-body': '' }, children)
  )
}
