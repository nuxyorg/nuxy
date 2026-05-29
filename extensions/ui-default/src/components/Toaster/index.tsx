import React, { useEffect, useState, useCallback } from 'react'
import { toastStore, Toast as ToastType, toast } from './store'
import './index.css'

export { toast }
export type { ToastOptions } from './store'

const Toast = ({ toast, onRemove }: { toast: ToastType; onRemove: (id: string) => void }) => {
  const [isExiting, setIsExiting] = useState(false)

  const handleClose = useCallback(() => {
    setIsExiting(true)
    // Wait for the exit animation to finish before actually removing
    setTimeout(() => {
      onRemove(toast.id)
    }, 200) // matches the slide-out animation duration
  }, [toast.id, onRemove])

  useEffect(() => {
    // If the store removes it, we also want to animate it out.
    // However, the store removes it immediately.
    // For a simple implementation, if the duration is passed, the store removes it.
    // We could override store behavior, but to keep it simple, we'll just let the store remove it instantly
    // or we can handle the duration here.
    // Let's just handle manual close animation here.
  }, [])

  return (
    <div
      className={`nuxy-toast nuxy-toast--${toast.type || 'info'} ${isExiting ? 'nuxy-toast--exiting' : ''}`}
      role="alert"
    >
      {toast.title && (
        <div className="nuxy-toast-header">
          <span className="nuxy-toast-title">{toast.title}</span>
          <button className="nuxy-toast-close" onClick={handleClose} aria-label="Close">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}
      <div className="nuxy-toast-message">
        {!toast.title && (
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
          >
            <span>{toast.message}</span>
            <button
              className="nuxy-toast-close"
              onClick={handleClose}
              aria-label="Close"
              style={{ marginLeft: '8px' }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        )}
        {toast.title && toast.message}
      </div>
    </div>
  )
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastType[]>([])

  useEffect(() => {
    setToasts(toastStore.getToasts())
    const unsubscribe = toastStore.subscribe((newToasts) => {
      setToasts(newToasts)
    })
    return unsubscribe
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="nuxy-toaster">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onRemove={(id) => toastStore.remove(id)} />
      ))}
    </div>
  )
}
