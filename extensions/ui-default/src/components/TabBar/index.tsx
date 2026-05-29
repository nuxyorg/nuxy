import React, { useRef, useEffect } from 'react'
import './index.css'
import { smoothScrollIntoViewIfNeeded } from '../../utils/scroll'

export interface TabOption {
  id: string
  label: string
  icon?: string
}

export interface TabBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  tabs: TabOption[]
  active: string
  onChange: (id: string) => void
  orientation?: 'horizontal' | 'vertical'
}

export function TabBar({
  tabs,
  active,
  onChange,
  orientation = 'horizontal',
  className,
  ...rest
}: TabBarProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const activeEl = containerRef.current.querySelector('.nuxy-tab--active')
    if (activeEl) {
      smoothScrollIntoViewIfNeeded(activeEl as HTMLElement)
    }
  }, [active])

  return (
    <div
      ref={containerRef}
      className={`nuxy-tab-bar nuxy-tab-bar--${orientation} ${className ?? ''}`}
      {...rest}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`nuxy-tab ${active === tab.id ? 'nuxy-tab--active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon && <span className="nuxy-tab__icon">{tab.icon}</span>}
          <span className="nuxy-tab__label">{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
