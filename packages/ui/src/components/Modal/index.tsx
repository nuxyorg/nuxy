
export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: unknown
  children: unknown
  footer?: unknown
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Modal(...args: any[]): unknown {
  return (window.UI as any)?.Modal?.(...args) ?? null
}
