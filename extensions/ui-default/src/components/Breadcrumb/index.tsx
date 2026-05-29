import React from 'react'
import './index.css'

export interface BreadcrumbItem {
  label: React.ReactNode
  href?: string
  onClick?: (e: React.MouseEvent) => void
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  separator?: React.ReactNode
  className?: string
}

export function Breadcrumb({ items, separator = '/', className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={`nuxy-breadcrumb ${className || ''}`}>
      <ol className="nuxy-breadcrumb">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1

          return (
            <li key={idx} className="nuxy-breadcrumb__item">
              {idx > 0 && (
                <span className="nuxy-breadcrumb__sep" aria-hidden="true">
                  {separator}
                </span>
              )}
              {isLast ? (
                <span className="nuxy-breadcrumb__current" aria-current="page">
                  {item.label}
                </span>
              ) : item.href ? (
                <a href={item.href} className="nuxy-breadcrumb__link" onClick={item.onClick}>
                  {item.label}
                </a>
              ) : (
                <span
                  className="nuxy-breadcrumb__link"
                  role="button"
                  tabIndex={0}
                  onClick={item.onClick}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      item.onClick?.(e as unknown as React.MouseEvent)
                    }
                  }}
                >
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
