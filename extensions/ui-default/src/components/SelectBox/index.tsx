import React, { useRef, useState, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
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
  onOpen?: (startIndex: number) => void
  placeholder?: string
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
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [internalFocused, setInternalFocused] = useState(0)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const handleKeyCapture = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
      }
    }
    document.addEventListener('keydown', handleKeyCapture, true)
    return () => document.removeEventListener('keydown', handleKeyCapture, true)
  }, [open])

  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      const idx = Math.max(
        0,
        options.findIndex((o) => o.value === value)
      )
      setInternalFocused(idx)
      setSearchQuery('')
    }
  }

  useEffect(() => {
    if (searchQuery.trim()) setInternalFocused(0)
  }, [searchQuery])

  useEffect(() => {
    if (open && searchable) {
      const id = setTimeout(() => searchRef.current?.focus(), 30)
      return () => clearTimeout(id)
    }
  }, [open, searchable])

  useLayoutEffect(() => {
    if (open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      const zoomStr = document.documentElement.style.zoom
      const zoom = zoomStr
        ? (zoomStr.endsWith('%') ? parseFloat(zoomStr) / 100 : parseFloat(zoomStr)) || 1
        : 1
      setDropdownPos({
        top: r.bottom / zoom + 4,
        left: r.right / zoom,
      })
    }
  }, [open])

  const filteredOptions =
    searchable && searchQuery.trim()
      ? options.filter(
          (o) =>
            o.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            o.value.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : options

  const activeFocusedIndex = searchable ? internalFocused : focusedIndex
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

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      e.stopPropagation()
      setInternalFocused((i) => Math.min(i + 1, filteredOptions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      setInternalFocused((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      const opt = filteredOptions[internalFocused]
      if (opt) onSelect(opt.value)
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
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

      {open &&
        options.length > 0 &&
        createPortal(
          <div
            className="nuxy-select-box__dropdown"
            style={{ top: dropdownPos.top, left: dropdownPos.left, transform: 'translateX(-100%)' }}
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
                  onKeyDown={handleSearchKeyDown}
                />
              </div>
            )}
            <div className="nuxy-select-box__options">
              {filteredOptions.length === 0 ? (
                <div className="nuxy-select-box__no-results">No results</div>
              ) : (
                filteredOptions.map((option, i) => {
                  const isFocused = i === activeFocusedIndex
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
          </div>,
          document.body
        )}
    </div>
  )
}
