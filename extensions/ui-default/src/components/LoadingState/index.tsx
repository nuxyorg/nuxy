import { h } from '../../h'
import './nuxy-loading-state.ts'

export interface LoadingStateProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  minHeight?: string
  className?: string
}

export function LoadingState({
  message,
  size = 'md',
  minHeight = '200px',
  className,
}: LoadingStateProps) {
  return h('nuxy-loading-state', {
    class: className,
    size,
    'min-height': minHeight,
    ...(message ? { message } : {}),
  })
}
