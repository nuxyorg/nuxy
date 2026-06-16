import { LitElement, html, css, nothing, customElement, property } from '@nuxyorg/core'
import type { TemplateResult } from '@nuxyorg/core'

export interface TabItemData {
  id: string
  label: string
  disabled?: boolean
}

function parseItems(raw: string | null): TabItemData[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as TabItemData[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

@customElement('nuxy-tabs')
export class NuxyTabsElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
    }

    .nuxy-tabs__list {
      display: flex;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      gap: var(--space-4);
      padding: 0;
      margin: 0;
      list-style: none;
    }

    .nuxy-tabs__trigger {
      background: transparent;
      border: none;
      color: var(--syntax-comment);
      font-size: var(--font-md);
      font-family: inherit;
      font-weight: 500;
      cursor: pointer;
      padding: var(--space-3) var(--space-1);
      position: relative;
      transition: color 0.15s ease;
      outline: none;
    }

    .nuxy-tabs__trigger:hover:not(:disabled) {
      color: var(--syntax-variable);
    }

    .nuxy-tabs__trigger--active {
      color: var(--syntax-operator);
    }

    .nuxy-tabs__trigger--active::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--syntax-operator);
      border-radius: 1px;
    }

    .nuxy-tabs__trigger:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .nuxy-tabs__content {
      padding: var(--space-4) 0;
      outline: none;
    }
  `

  @property({ type: String })
  declare active: string
  @property({ type: String })
  declare items: string

  updated(): void {
    this.syncPanels()
  }

  private getItems(): TabItemData[] {
    return parseItems(this.items)
  }

  private getActiveId(): string {
    const items = this.getItems()
    return this.active || items[0]?.id || ''
  }

  private select(id: string, disabled?: boolean): void {
    if (disabled) return
    this.active = id
    this.requestUpdate()
    this.dispatchEvent(
      new CustomEvent('nuxy-tabs-change', { detail: { id }, bubbles: true, composed: true })
    )
  }

  private syncPanels(): void {
    const active = this.getActiveId()
    const content = this.renderRoot.querySelector('.nuxy-tabs__content')
    if (!content) return

    for (const el of Array.from(this.querySelectorAll('[data-tab-content]'))) {
      const id = el.getAttribute('data-tab-content')
      if (!id) continue
      const panel = el as HTMLElement
      panel.hidden = id !== active
      if (id === active) {
        content.appendChild(panel)
      } else if (panel.parentElement === content) {
        this.appendChild(panel)
      }
    }

    content.id = `panel-${active}`
    content.setAttribute('aria-labelledby', `tab-${active}`)
  }

  render(): TemplateResult {
    const items = this.getItems()
    const active = this.getActiveId()

    return html`
      <div class="nuxy-tabs__list" role="tablist">
        ${items.map((item) => {
          const isActive = item.id === active
          return html`
            <button
              type="button"
              role="tab"
              id="tab-${item.id}"
              aria-selected=${String(isActive)}
              aria-controls="panel-${item.id}"
              ?disabled=${Boolean(item.disabled)}
              class="nuxy-tabs__trigger ${isActive ? 'nuxy-tabs__trigger--active' : ''}"
              @click=${() => this.select(item.id, item.disabled)}
            >
              ${item.label}
            </button>
          `
        })}
      </div>
      <div
        class="nuxy-tabs__content"
        role="tabpanel"
        id="panel-${active}"
        aria-labelledby="tab-${active}"
        tabindex="0"
      ></div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-tabs': NuxyTabsElement
  }
}
