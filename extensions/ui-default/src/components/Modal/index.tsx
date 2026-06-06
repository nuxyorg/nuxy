import React from 'react'
import './index.css'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
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
}: ModalProps) {
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="nuxy-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className={`nuxy-modal nuxy-modal--${size} ${className || ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'nuxy-modal-title' : undefined}
        tabIndex={-1}
      >
        <div className="nuxy-modal__header">
          <h2 id="nuxy-modal-title" className="nuxy-modal__title">
            {title || 'Dialog'}
          </h2>
          {/* fallow-ignore-next-line code-duplication */}
          <button
            type="button"
            className="nuxy-modal__close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="nuxy-modal__body">{children}</div>
        {footer && <div className="nuxy-modal__footer">{footer}</div>}
      </div>
    </div>
  )
}
