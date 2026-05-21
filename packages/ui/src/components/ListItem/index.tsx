import React, { useRef, useEffect } from 'react'
import './index.css'

export interface ListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean
  className?: string
}

export function ListItem({
  children,
  active,
  className,
  onClick,
  onKeyDown,
  ...props
}: ListItemProps) {
  const interactive = Boolean(onClick)
  const itemRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (active && itemRef.current) {
      itemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [active])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (interactive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>)
    }
    onKeyDown?.(e)
  }

  return (
    <div
      ref={itemRef}
      className={`nuxy-list-item ${active ? 'nuxy-list-item--active' : ''} ${className || ''}`}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={interactive ? handleKeyDown : onKeyDown}
      {...props}
    >
      {children}
    </div>
  )
}
