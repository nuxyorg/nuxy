import React from 'react'
import './index.css'

export interface TabItem {
  id: string
  label: React.ReactNode
  content: React.ReactNode
  disabled?: boolean
}

export interface TabsProps {
  items: TabItem[]
  activeId?: string
  defaultActiveId?: string
  onChange?: (id: string) => void
  className?: string
}

export function Tabs({ items, activeId, defaultActiveId, onChange, className }: TabsProps) {
  const [internalActive, setInternalActive] = React.useState(defaultActiveId ?? items[0]?.id)
  const isControlled = activeId !== undefined
  const active = isControlled ? activeId : internalActive

  const handleSelect = (id: string, disabled?: boolean) => {
    if (disabled) return
    if (!isControlled) setInternalActive(id)
    onChange?.(id)
  }

  const activeContent = items.find((item) => item.id === active)?.content

  return (
    <div className={`nuxy-tabs ${className || ''}`}>
      <div className="nuxy-tabs__list" role="tablist">
        {items.map((item) => {
          const isActive = item.id === active
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${item.id}`}
              id={`tab-${item.id}`}
              disabled={item.disabled}
              className={['nuxy-tabs__trigger', isActive ? 'nuxy-tabs__trigger--active' : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => handleSelect(item.id, item.disabled)}
            >
              {item.label}
            </button>
          )
        })}
      </div>
      <div
        id={`panel-${active}`}
        role="tabpanel"
        aria-labelledby={`tab-${active}`}
        className="nuxy-tabs__content"
        tabIndex={0}
      >
        {activeContent}
      </div>
    </div>
  )
}
