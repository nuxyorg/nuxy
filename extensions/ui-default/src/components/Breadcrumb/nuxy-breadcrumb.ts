import { LitElement, html, css, nothing, customElement, property } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'

export interface BreadcrumbCeItem {
  label: string
  href?: string
  index?: number
}

function parseItems(raw: string | null): BreadcrumbCeItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as BreadcrumbCeItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

@customElement('nuxy-breadcrumb')
export class NuxyBreadcrumbElement extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .nuxy-breadcrumb {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0;
      list-style: none;
      margin: 0;
      padding: 0;
      font-size: var(--font-sm);
    }

    .nuxy-breadcrumb__item {
      display: inline-flex;
      align-items: center;
    }

    .nuxy-breadcrumb__link {
      color: var(--syntax-comment);
      text-decoration: none;
      cursor: pointer;
      transition: color 0.15s ease;
      padding: 2px 4px;
      border-radius: var(--radius-sm);
    }

    .nuxy-breadcrumb__link:hover {
      color: var(--syntax-variable);
    }

    .nuxy-breadcrumb__current {
      color: var(--syntax-variable);
      padding: 2px 4px;
      font-weight: 500;
    }

    .nuxy-breadcrumb__sep {
      color: var(--syntax-comment);
      padding: 0 var(--space-1);
      user-select: none;
      opacity: 0.5;
    }
  `

  @property({ type: String }) items = ''
  @property({ type: String }) separator = '/'

  private renderItem(item: BreadcrumbCeItem, idx: number, total: number): TemplateResult {
    const isLast = idx === total - 1
    const itemIndex = item.index ?? idx
    const sep =
      idx > 0
        ? html`<span class="nuxy-breadcrumb__sep" aria-hidden="true">${this.separator}</span>`
        : nothing

    let content: TemplateResult
    if (isLast) {
      content = html`<span class="nuxy-breadcrumb__current" aria-current="page"
        >${item.label}</span
      >`
    } else if (item.href) {
      content = html`<a href=${item.href} class="nuxy-breadcrumb__link">${item.label}</a>`
    } else {
      content = html`
        <button
          type="button"
          class="nuxy-breadcrumb__link"
          @click=${() =>
            this.dispatchEvent(
              new CustomEvent('nuxy-breadcrumb-navigate', {
                detail: { index: itemIndex },
                bubbles: true,
              })
            )}
        >
          ${item.label}
        </button>
      `
    }

    return html`<li class="nuxy-breadcrumb__item">${sep}${content}</li>`
  }

  render(): TemplateResult {
    const rawItems = this.items || this.getAttribute('items')
    const items = parseItems(rawItems)

    return html`
      <nav aria-label="Breadcrumb">
        <ol class="nuxy-breadcrumb">
          ${items.map((item, idx) => this.renderItem(item, idx, items.length))}
        </ol>
      </nav>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-breadcrumb': NuxyBreadcrumbElement
  }
}
