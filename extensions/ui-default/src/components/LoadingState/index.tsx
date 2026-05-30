import React from 'react'
import { Spinner } from '../Spinner'

export interface LoadingStateProps {
  /** Optional message displayed below the spinner */
  message?: string
  /** Spinner size — forwarded to Spinner */
  size?: 'sm' | 'md' | 'lg'
  /** Minimum block height so the container has presence. Defaults to '200px' */
  minHeight?: string
  className?: string
}

/**
 * Full-block centered loading state.
 *
 * Renders a Spinner (and optional muted message) in a flex column that fills
 * its container. Use this wherever an extension shows a "fetching …" state
 * instead of rolling a one-off Stack + Spinner + Text composition.
 *
 * @example
 * if (loading) return <LoadingState message="Fetching video details…" />
 */
export function LoadingState({
  message,
  size = 'md',
  minHeight = '200px',
  className,
}: LoadingStateProps) {
  return (
    <div
      className={`nuxy-loading-state ${className || ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        minHeight,
        gap: 'var(--space-3)',
      }}
      role="status"
      aria-label={message || 'Loading'}
    >
      <Spinner size={size} aria-label={message || 'Loading'} />
      {message && (
        <span
          style={{
            fontSize: 'var(--font-sm)',
            color: 'var(--text-muted)',
            opacity: 0.75,
          }}
        >
          {message}
        </span>
      )}
    </div>
  )
}
