export interface AlertDialogProps {
  isOpen: boolean
  onClose: () => void
  title: unknown
  children: unknown
  confirmLabel?: string
  cancelLabel?: string
  onConfirm?: () => void
  variant?: 'default' | 'destructive'
  className?: string
}
