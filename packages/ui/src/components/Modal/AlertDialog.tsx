import React from 'react'



export interface AlertDialogProps {
  isOpen: boolean
  onClose: () => void
  title: React.ReactNode
  children: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  variant?: 'danger' | 'warning' | 'info'
  className?: string
}

export function AlertDialog(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.AlertDialog || (() => null);
  return <Impl {...props} />;
}

