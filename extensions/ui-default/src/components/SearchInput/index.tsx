import React from 'react'
import './index.css'

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string
  onChange?: (value: string) => void
  onClear?: () => void
  className?: string
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, onClear, className, placeholder = 'Search…', ...props }, ref) => {
    const handleClear = () => {
      onChange?.('')
      onClear?.()
    }

    return (
      <div className={`nuxy-search-input ${className || ''}`}>
        <span className="nuxy-search-input__icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          ref={ref}
          type="text"
          className="nuxy-search-input__field"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          {...props}
        />
        {value && (
          <button
            type="button"
            className="nuxy-search-input__clear"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    )
  }
)
SearchInput.displayName = 'SearchInput'
