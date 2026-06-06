import React from 'react'
import './index.css'

export interface CircularProgressProps {
  value?: number // 0-100, omit for indeterminate spinner
  size?: number // size in px
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
}: CircularProgressProps) {
  const indeterminate = value === undefined
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const offset = indeterminate ? 0 : circumference - (value / 100) * circumference

  return (
    <div
      className={`nuxy-circular-progress ${className || ''}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg
        className="nuxy-circular-progress__svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          className="nuxy-circular-progress__track"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          className={[
            'nuxy-circular-progress__fill',
            indeterminate ? 'nuxy-circular-progress__fill--indeterminate' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          fill="none"
        />
      </svg>
      {showLabel && !indeterminate && (
        <span className="nuxy-circular-progress__label">{Math.round(value)}%</span>
      )}
    </div>
  )
}

/* ErrorState */
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
}: ErrorStateProps) {
  return (
    <div className={`nuxy-error-state ${className || ''}`} role="alert">
      <span className="nuxy-error-state__icon" aria-hidden="true">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </span>
      <h3 className="nuxy-error-state__title">{title}</h3>
      <p className="nuxy-error-state__message">{message}</p>
      {onRetry && (
        <button type="button" className="nuxy-button nuxy-button--default" onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  )
}

/* Banner */
export interface BannerProps {
  variant?: 'info' | 'warning' | 'error' | 'success'
  children: React.ReactNode
  onClose?: () => void
  className?: string
}

export function Banner({ variant = 'info', children, onClose, className }: BannerProps) {
  return (
    <div className={`nuxy-banner nuxy-banner--${variant} ${className || ''}`} role="status">
      <div className="nuxy-banner__content">{children}</div>
      {// fallow-ignore-next-line code-duplication
      onClose && (
        <button
          type="button"
          className="nuxy-banner__close"
          onClick={onClose}
          aria-label="Dismiss banner"
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
      )}
    </div>
  )
}
