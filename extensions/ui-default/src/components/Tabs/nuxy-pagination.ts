import { syncHostClasses } from '../../h.ts'
import '../Tabs/index.css'

const PREV_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`
const NEXT_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`

function buildPages(current: number, totalPages: number, siblings: number): (number | string)[] {
  const pages: (number | string)[] = []
  const leftLimit = current - siblings
  const rightLimit = current + siblings

  pages.push(1)

  if (leftLimit > 2) pages.push('…')

  const start = Math.max(2, leftLimit)
  const end = Math.min(totalPages - 1, rightLimit)

  for (let i = start; i <= end; i++) pages.push(i)

  if (rightLimit < totalPages - 1) pages.push('…')

  if (totalPages > 1) pages.push(totalPages)

  return pages
}

export class NuxyPaginationElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['total', 'current', 'page-size', 'siblings']
  }

  connectedCallback(): void {
    this.render()
    this.addEventListener('click', this.onClick)
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.onClick)
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render()
  }

  private onClick = (e: Event): void => {
    const btn = (e.target as HTMLElement).closest('[data-page]') as HTMLElement | null
    if (!btn || btn.hasAttribute('disabled')) return
    const page = Number(btn.getAttribute('data-page'))
    if (!Number.isFinite(page)) return
    this.dispatchEvent(
      new CustomEvent('nuxy-pagination-change', { detail: { page }, bubbles: true, composed: true })
    )
  }

  private render(): void {
    const total = Number(this.getAttribute('total') ?? '0')
    const current = Number(this.getAttribute('current') ?? '1')
    const pageSize = Number(this.getAttribute('page-size') ?? '10')
    const siblings = Number(this.getAttribute('siblings') ?? '1')
    const extraClass = this.getAttribute('class') ?? ''

    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const pages = buildPages(current, totalPages, siblings)

    syncHostClasses(this, 'nuxy-pagination')
    this.setAttribute('aria-label', 'Pagination Navigation')
    this.replaceChildren()

    const prev = document.createElement('button')
    prev.type = 'button'
    prev.className = 'nuxy-pagination__btn'
    prev.setAttribute('aria-label', 'Previous Page')
    prev.innerHTML = PREV_SVG
    prev.toggleAttribute('disabled', current <= 1)
    if (current > 1) prev.setAttribute('data-page', String(current - 1))
    this.appendChild(prev)

    let ellipsisCount = 0
    for (const page of pages) {
      if (typeof page === 'string') {
        const side = ellipsisCount++ === 0 ? 'left' : 'right'
        const span = document.createElement('span')
        span.className = 'nuxy-pagination__ellipsis'
        span.textContent = page
        span.setAttribute('data-ellipsis', side)
        this.appendChild(span)
        continue
      }

      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = [
        'nuxy-pagination__btn',
        page === current ? 'nuxy-pagination__btn--active' : '',
      ]
        .filter(Boolean)
        .join(' ')
      btn.textContent = String(page)
      btn.setAttribute('data-page', String(page))
      if (page === current) btn.setAttribute('aria-current', 'page')
      this.appendChild(btn)
    }

    const next = document.createElement('button')
    next.type = 'button'
    next.className = 'nuxy-pagination__btn'
    next.setAttribute('aria-label', 'Next Page')
    next.innerHTML = NEXT_SVG
    next.toggleAttribute('disabled', current >= totalPages)
    if (current < totalPages) next.setAttribute('data-page', String(current + 1))
    this.appendChild(next)
  }
}

if (!customElements.get('nuxy-pagination')) {
  customElements.define('nuxy-pagination', NuxyPaginationElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-pagination': NuxyPaginationElement
  }
}
