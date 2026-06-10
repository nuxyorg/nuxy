import { LitElement, html, css, nothing, customElement, property } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'

const PREV_ICON: TemplateResult = html`<svg
  width="14"
  height="14"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <polyline points="15 18 9 12 15 6" />
</svg>`
const NEXT_ICON: TemplateResult = html`<svg
  width="14"
  height="14"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <polyline points="9 18 15 12 9 6" />
</svg>`

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

@customElement('nuxy-pagination')
export class NuxyPaginationElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      user-select: none;
    }

    .nuxy-pagination__btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      height: 32px;
      padding: 0 var(--space-2);
      border-radius: var(--radius-md);
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: transparent;
      color: var(--syntax-variable);
      font-size: var(--font-sm);
      font-weight: 500;
      cursor: pointer;
      transition:
        background 0.15s ease,
        border-color 0.15s ease,
        color 0.15s ease;
      outline: none;
    }

    .nuxy-pagination__btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.15);
    }

    .nuxy-pagination__btn--active {
      background: var(--syntax-operator) !important;
      border-color: var(--syntax-operator) !important;
      color: #000 !important;
      font-weight: 600;
    }

    .nuxy-pagination__btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .nuxy-pagination__ellipsis {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      color: var(--syntax-comment);
      font-size: var(--font-sm);
    }
  `

  @property({ type: Number }) total = 0
  @property({ type: Number }) current = 1
  @property({ attribute: 'page-size', type: Number }) pageSize = 10
  @property({ type: Number }) siblings = 1

  connectedCallback(): void {
    super.connectedCallback()
    this.setAttribute('aria-label', 'Pagination Navigation')
  }

  private navigate(page: number): void {
    this.dispatchEvent(
      new CustomEvent('nuxy-pagination-change', { detail: { page }, bubbles: true, composed: true })
    )
  }

  render(): TemplateResult {
    const { total, current, pageSize, siblings } = this
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const pages = buildPages(current, totalPages, siblings)

    let ellipsisCount = 0

    return html`
      <button
        type="button"
        class="nuxy-pagination__btn"
        aria-label="Previous Page"
        ?disabled=${current <= 1}
        @click=${() => current > 1 && this.navigate(current - 1)}
      >
        ${PREV_ICON}
      </button>
      ${pages.map((page) => {
        if (typeof page === 'string') {
          const side = ellipsisCount++ === 0 ? 'left' : 'right'
          return html`<span class="nuxy-pagination__ellipsis" data-ellipsis=${side}>${page}</span>`
        }
        return html`
          <button
            type="button"
            class="nuxy-pagination__btn ${page === current ? 'nuxy-pagination__btn--active' : ''}"
            data-page=${String(page)}
            aria-current=${page === current ? 'page' : nothing}
            @click=${() => this.navigate(page as number)}
          >
            ${page}
          </button>
        `
      })}
      <button
        type="button"
        class="nuxy-pagination__btn"
        aria-label="Next Page"
        ?disabled=${current >= totalPages}
        @click=${() => current < totalPages && this.navigate(current + 1)}
      >
        ${NEXT_ICON}
      </button>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-pagination': NuxyPaginationElement
  }
}
