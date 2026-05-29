import React from 'react'
import './index.css'

export interface TagProps {
  children: React.ReactNode
  onRemove?: () => void
  variant?: 'default' | 'blue' | 'green' | 'orange' | 'red'
  className?: string
}

export function Tag({ children, onRemove, variant = 'default', className }: TagProps) {
  return (
    <span className={`nuxy-tag ${variant !== 'default' ? `nuxy-tag--${variant}` : ''} ${onRemove ? 'nuxy-tag--removable' : ''} ${className || ''}`}>
      <span className="nuxy-tag__label">{children}</span>
      {onRemove && (
        <button
          type="button"
          className="nuxy-tag__remove"
          onClick={onRemove}
          aria-label="Remove"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </span>
  )
}

/** Alias */
export { Tag as Chip }
