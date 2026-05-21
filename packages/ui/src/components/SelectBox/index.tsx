import React, { useRef, useState, useEffect, useLayoutEffect } from 'react'
import './index.css'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectBoxProps {
  options: SelectOption[]
  value?: string
  open: boolean
  focusedIndex: number
  onSelect: (value: string) => void
  onClose: () => void
  /** Called when trigger is clicked — parent should set focusedIndex and open=true. */
  onOpen?: (startIndex: number) => void
  placeholder?: string
  /** When true, shows a search input inside the dropdown to filter options. */
  searchable?: boolean
}

export function SelectBox({
  options,
  value,
  open,
  focusedIndex,
  onSelect,
  onClose,
  onOpen,
  placeholder = '—',
  searchable = false,
}: SelectBoxProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number }>({
    top: 0,
    right: 0,
  })
  const [searchQuery, setSearchQuery] = useState('')

  // Reset search when dropdown closes
  useEffect(() => {
    if (!open) setSearchQuery('')
  }, [open])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => searchRef.current?.focus(), 30)
    }
  }, [open, searchable])

  useLayoutEffect(() => {
    if (open && triggerRef.current) {
      let zoom = 1
      const zoomStyle = document.documentElement.style.zoom
      if (zoomStyle) {
        if (zoomStyle.endsWith('%')) {
          zoom = parseFloat(zoomStyle) / 100
        } else {
          zoom = parseFloat(zoomStyle)
        }
      }
      if (isNaN(zoom) || zoom <= 0) zoom = 1

      const r = triggerRef.current.getBoundingClientRect()
      setDropdownPos({
        top: r.bottom / zoom + 4,
        right: (window.innerWidth - r.right) / zoom,
      })
    }
  }, [open])

  const filteredOptions = searchable && searchQuery.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.value.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options

  const currentLabel = options.find((o) => o.value === value)?.label ?? placeholder

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (open) {
      onClose()
    } else {
      const idx = Math.max(
        0,
        options.findIndex((o) => o.value === value)
      )
      onOpen?.(idx)
    }
  }

  return (
    <div className="nuxy-select-box">
      <button
        ref={triggerRef}
        type="button"
        tabIndex={-1}
        className={`nuxy-select-box__trigger${open ? ' nuxy-select-box__trigger--open' : ''}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleTriggerClick}
      >
        <span className="nuxy-select-box__value">{currentLabel}</span>
        <span
          className={`nuxy-select-box__chevron${open ? ' nuxy-select-box__chevron--open' : ''}`}
        >
          ▾
        </span>
      </button>

      {open && options.length > 0 && (
        <div
          className="nuxy-select-box__dropdown"
          style={{ top: dropdownPos.top, right: dropdownPos.right }}
          role="listbox"
        >
          {searchable && (
            <div className="nuxy-select-box__search-wrapper">
              <input
                ref={searchRef}
                className="nuxy-select-box__search"
                placeholder="Search…"
                value={searchQuery}
                tabIndex={-1}
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  // Let parent handle ArrowUp/Down/Enter/Escape — but don't propagate
                  if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) {
                    e.stopPropagation()
                    if (e.key === 'Escape') onClose()
                  }
                }}
              />
            </div>
          )}
          <div className="nuxy-select-box__options">
            {filteredOptions.length === 0 ? (
              <div className="nuxy-select-box__no-results">No results</div>
            ) : (
              filteredOptions.map((option, i) => {
                const isFocused = i === focusedIndex
                const isSelected = option.value === value
                return (
                  <div
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    className={[
                      'nuxy-select-box__option',
                      isFocused ? 'nuxy-select-box__option--focused' : '',
                      isSelected ? 'nuxy-select-box__option--selected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelect(option.value)
                    }}
                  >
                    <span className="nuxy-select-box__option-label">{option.label}</span>
                    {isSelected && <span className="nuxy-select-box__option-check">✓</span>}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
