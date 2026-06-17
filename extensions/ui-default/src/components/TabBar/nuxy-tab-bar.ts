import {
  LitElement,
  html,
  css,
  nothing,
  customElement,
  property,
  query as queryDecorator,
} from '@nuxyorg/core'
import type { TemplateResult } from '@nuxyorg/core'
import { smoothScrollIntoViewIfNeeded } from '../../hooks/scroll-into-view'

export interface TabBarTab {
  id: string
  label: string
  icon?: string
}

function parseTabs(raw: string | null): TabBarTab[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as TabBarTab[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

@customElement('nuxy-tab-bar')
export class NuxyTabBarElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      gap: 2px;
      flex-shrink: 0;
    }

    :host([orientation='horizontal']) {
      overflow-x: overlay;
      padding: 4px 8px;
      border-bottom: 1px solid var(--border);
    }

    :host([orientation='vertical']) {
      flex-direction: column;
      overflow-y: overlay;
      gap: 0;
    }

    .nuxy-tab {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-family: inherit;
      color: var(--text-muted);
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 8px;
      transition:
        background 0.1s,
        color 0.1s;
    }

    .nuxy-tab:hover {
      background: var(--hover);
      color: var(--text, rgba(255, 255, 255, 0.8));
    }

    .nuxy-tab--active {
      background: var(--accent-subtle);
      color: var(--accent);
    }

    .nuxy-tab__icon {
      font-size: 1.1em;
      opacity: 0.8;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Vertical Tab Theme Overrides (Match List/ListItem) */
    :host([orientation='vertical']) .nuxy-tab {
      border-radius: 0;
      padding: var(--space-4) var(--space-5);
      border-left: 2px solid transparent;
      color: inherit;
      font-size: 0.85rem;
    }

    :host([orientation='vertical']) .nuxy-tab:not(.nuxy-tab--active):hover {
      background-color: var(--syntax-comment);
      border-left-color: var(--syntax-comment);
      color: var(--text, rgba(255, 255, 255, 0.8));
    }

    :host([orientation='vertical']) .nuxy-tab--active {
      background-color: var(--syntax-comment);
      border-left-color: var(--syntax-operator);
      color: var(--text, rgba(255, 255, 255, 0.8));
    }
  `

  @property({ type: String })
  declare tabs: string
  @property({ type: String })
  declare active: string
  @property({ type: String, reflect: true })
  declare orientation: string

  @queryDecorator('.nuxy-tab--active')
  private activeTabEl!: HTMLElement | null

  private _prevActive = ''

  updated(): void {
    if (this.active !== this._prevActive) {
      this._prevActive = this.active
      this.scrollActiveIntoView()
    }
  }

  private select(id: string): void {
    this.active = id
    this.requestUpdate()
    this.scrollActiveIntoView()
    this.dispatchEvent(new CustomEvent('nuxy-tab-bar-change', { detail: { id }, bubbles: true }))
  }

  private scrollActiveIntoView(): void {
    if (this.activeTabEl instanceof HTMLElement) {
      smoothScrollIntoViewIfNeeded(this.activeTabEl)
    }
  }

  render(): TemplateResult {
    const tabs = parseTabs(this.tabs)
    const active = this.active

    return html`
      ${tabs.map(
        (tab) => html`
          <button
            class="nuxy-tab ${active === tab.id ? 'nuxy-tab--active' : ''}"
            @click=${() => this.select(tab.id)}
          >
            ${tab.icon ? html`<span class="nuxy-tab__icon">${tab.icon}</span>` : nothing}
            <span class="nuxy-tab__label">${tab.label}</span>
          </button>
        `
      )}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-tab-bar': NuxyTabBarElement
  }
}
