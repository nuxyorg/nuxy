import React from 'react'
import '../Tabs/index.css'

export interface PaginationProps {
  total: number // total items
  current: number // 1-indexed current page
  pageSize?: number
  onChange: (page: number) => void
  siblings?: number
  className?: string
}

export function Pagination({
  total,
  current,
  pageSize = 10,
  onChange,
  siblings = 1,
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const getPages = () => {
    const pages: (number | string)[] = []
    const leftLimit = current - siblings
    const rightLimit = current + siblings

    pages.push(1)

    if (leftLimit > 2) {
      pages.push('…')
    }

    const start = Math.max(2, leftLimit)
    const end = Math.min(totalPages - 1, rightLimit)

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (rightLimit < totalPages - 1) {
      pages.push('…')
    }

    if (totalPages > 1) {
      pages.push(totalPages)
    }

    return pages
  }

  return (
    <nav className={`nuxy-pagination ${className || ''}`} aria-label="Pagination Navigation">
      <button
        type="button"
        disabled={current <= 1}
        onClick={() => onChange(current - 1)}
        className="nuxy-pagination__btn"
        aria-label="Previous Page"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {getPages().map((page, idx) => {
        if (typeof page === 'string') {
          return (
            <span key={idx} className="nuxy-pagination__ellipsis">
              {page}
            </span>
          )
        }

        return (
          <button
            key={idx}
            type="button"
            onClick={() => onChange(page)}
            className={[
              'nuxy-pagination__btn',
              page === current ? 'nuxy-pagination__btn--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-current={page === current ? 'page' : undefined}
          >
            {page}
          </button>
        )
      })}

      <button
        type="button"
        disabled={current >= totalPages}
        onClick={() => onChange(current + 1)}
        className="nuxy-pagination__btn"
        aria-label="Next Page"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </nav>
  )
}
