import type { UiChild } from '../../types'
import { h } from '../../h'
import { host } from '../../host'
import './nuxy-circular-progress.ts'
import './nuxy-error-state.ts'
import './nuxy-banner.ts'

export interface CircularProgressProps {
  value?: number
  size?: number
  strokeWidth?: number
  showLabel?: boolean
  className?: string
}

export function CircularProgress({
  value,
  size = 40,
  strokeWidth = 4,
  showLabel = false,
  className,
}: CircularProgressProps): HTMLElement {
  return h('nuxy-circular-progress', {
    class: className,
    size: String(size),
    'stroke-width': String(strokeWidth),
    ...(value !== undefined ? { value: String(value) } : {}),
    ...(showLabel ? { 'show-label': '' } : {}),
  })
}

export interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
  className,
}: ErrorStateProps): HTMLElement {
  const listeners: Record<string, EventListener> = {}
  if (onRetry) {
    listeners['nuxy-error-state-retry'] = () => onRetry()
  }
  return host(
    'nuxy-error-state',
    {
      class: className,
      title,
      message,
      ...(onRetry ? { 'retry-label': retryLabel } : {}),
    },
    listeners
  )
}

export interface BannerProps {
  variant?: 'info' | 'warning' | 'error' | 'success'
  children: UiChild
  onClose?: () => void
  className?: string
}

export function Banner({
  variant = 'info',
  children,
  onClose,
  className,
}: BannerProps): HTMLElement {
  const listeners: Record<string, EventListener> = {}
  if (onClose) {
    listeners['nuxy-banner-close'] = () => onClose()
  }
  return host(
    'nuxy-banner',
    {
      variant,
      class: className,
      ...(onClose ? { dismissible: '' } : {}),
    },
    listeners,
    children
  )
}
