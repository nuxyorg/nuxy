
export interface CircularProgressProps {
  value?: number // 0-100, omit for indeterminate spinner
  size?: number // size in px
  strokeWidth?: number
  showLabel?: boolean
  className?: string
}

/* ErrorState */
export interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

/* Banner */
export interface BannerProps {
  variant?: 'info' | 'warning' | 'error' | 'success'
  children: unknown
  onClose?: () => void
  className?: string
}

export function CircularProgress(...args: any[]): unknown {
  return (window.UI as any)?.CircularProgress?.(...args) ?? null
}

export function ErrorState(...args: any[]): unknown {
  return (window.UI as any)?.ErrorState?.(...args) ?? null
}

export function Banner(...args: any[]): unknown {
  return (window.UI as any)?.Banner?.(...args) ?? null
}
