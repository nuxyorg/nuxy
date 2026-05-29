import React from 'react'
import './index.css'

export interface ProgressBarProps {
  value?: number // 0-100, omit for indeterminate
  max?: number
  size?: 'sm' | 'md' | 'lg'
  label?: string
  showValue?: boolean
  className?: string
}

export function ProgressBar({ value, max = 100, size = 'md', label, showValue = false, className }: ProgressBarProps) {
  const indeterminate = value === undefined
  const pct = indeterminate ? 0 : Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={`nuxy-progress ${className || ''}`} role="progressbar" aria-valuenow={indeterminate ? undefined : pct} aria-valuemin={0} aria-valuemax={100}>
      {(label || showValue) && (
        <div className="nuxy-progress__header">
          {label && <span>{label}</span>}
          {showValue && !indeterminate && <span>{Math.round(pct)}%</span>}
        </div>
      )}
      <div className={`nuxy-progress__track nuxy-progress__track--${size}`}>
        <div
          className={`nuxy-progress__fill ${indeterminate ? 'nuxy-progress__fill--indeterminate' : ''}`}
          style={indeterminate ? undefined : { width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
