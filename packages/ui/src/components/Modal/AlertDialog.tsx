
export interface AlertDialogProps {
  isOpen: boolean
  onClose: () => void
  title: unknown
  children: unknown
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  variant?: 'danger' | 'warning' | 'info'
  className?: string
}

export function AlertDialog(...args: any[]): unknown {
  return (window.UI as any)?.AlertDialog?.(...args) ?? null
}
