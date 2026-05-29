import React from 'react'
import './index.css'

export interface DropdownItemProps {
  onClick?: (e: React.MouseEvent) => void
  disabled?: boolean
  variant?: 'default' | 'danger'
  children: React.ReactNode
  className?: string
}

export function DropdownItem({
  onClick,
  disabled,
  variant = 'default',
  children,
  className,
}: DropdownItemProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`nuxy-dropdown-item ${variant === 'danger' ? 'nuxy-dropdown-item--danger' : ''} ${className || ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function DropdownDivider() {
  return <div className="nuxy-dropdown-divider" role="separator" />
}

export interface DropdownHeaderProps {
  children: React.ReactNode
}

export function DropdownHeader({ children }: DropdownHeaderProps) {
  return <div className="nuxy-dropdown-header">{children}</div>
}

export interface DropdownMenuProps {
  trigger: React.ReactElement
  children: React.ReactNode
  align?: 'left' | 'right'
  className?: string
}

export function DropdownMenu({ trigger, children, align = 'right', className }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const wrapperRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isOpen])

  const triggerEl = React.cloneElement(trigger, {
    onClick: (e: React.MouseEvent) => {
      trigger.props.onClick?.(e)
      setIsOpen((prev) => !prev)
    },
  })

  return (
    <div ref={wrapperRef} className={`nuxy-dropdown-wrapper ${className || ''}`}>
      {triggerEl}
      <div
        className={[
          'nuxy-dropdown-menu',
          align === 'left' ? 'nuxy-dropdown-menu--left' : '',
          isOpen ? 'nuxy-dropdown-menu--open' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    </div>
  )
}
