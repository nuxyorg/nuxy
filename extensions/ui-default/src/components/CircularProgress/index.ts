export interface CircularProgressProps {
  value?: number
  size?: number
  strokeWidth?: number
  showLabel?: boolean
  className?: string
}
export interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}
export interface BannerProps {
  variant?: 'info' | 'warning' | 'error' | 'success'
  children: unknown
  onClose?: () => void
  className?: string
}
