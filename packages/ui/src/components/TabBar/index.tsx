import React from 'react'
import './index.css'

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

export function TabBar({ tabs, active, onChange, orientation = 'horizontal', className, ...rest }: TabBarProps) {
  return (
    <div className={`nuxy-tab-bar nuxy-tab-bar--${orientation} ${className ?? ''}`} {...rest}>
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
