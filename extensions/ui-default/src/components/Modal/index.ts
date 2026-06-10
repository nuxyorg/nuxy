export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: unknown
  children: unknown
  footer?: unknown
  size?: 'sm' | 'md' | 'lg'
  className?: string
}
