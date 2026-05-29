import React from 'react'
import '../Modal/index.css'
import { Modal } from './index'

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

export function AlertDialog({
  isOpen,
  onClose,
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'danger',
  className,
}: AlertDialogProps) {
  const footer = (
    <>
      <button type="button" className="nuxy-button nuxy-button--default" onClick={onClose}>
        {cancelLabel}
      </button>
      <button
        type="button"
        className={`nuxy-button ${variant === 'danger' ? 'nuxy-button--destructive' : 'nuxy-button--primary'}`}
        onClick={() => {
          onConfirm()
          onClose()
        }}
      >
        {confirmLabel}
      </button>
    </>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={footer}
      size="sm"
      className={`nuxy-alert-dialog nuxy-alert-dialog--${variant} ${className || ''}`}
    >
      {children}
    </Modal>
  )
}
