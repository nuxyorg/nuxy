import React from 'react'
import '../ProgressBar/index.css'

const SIZES = { sm: 16, md: 24, lg: 36 }

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | number
  className?: string
  'aria-label'?: string
}

export function Spinner({ size = 'md', className, 'aria-label': ariaLabel = 'Loading…' }: SpinnerProps) {
  const px = typeof size === 'number' ? size : SIZES[size]
  const r = (px / 2) * 0.7
  const circumference = 2 * Math.PI * r

  return (
    <span className={`nuxy-spinner ${className || ''}`} role="status" aria-label={ariaLabel}>
      <svg
        className="nuxy-spinner__svg"
        width={px}
        height={px}
        viewBox={`0 0 ${px} ${px}`}
        fill="none"
      >
        <circle
          className="nuxy-spinner__circle"
          cx={px / 2}
          cy={px / 2}
          r={r}
          strokeWidth={px * 0.1}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.25}
        />
      </svg>
    </span>
  )
}
