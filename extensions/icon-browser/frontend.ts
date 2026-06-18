import {
  LitElement,
  html,
  css,
  customElement,
  property,
  ref,
  nothing,
  safeSVG,
} from '@nuxyorg/core'
import type { NuxyToolElement } from '@nuxyorg/core'
import { IconBrowserController } from './controller.ts'

const MIN_CELL_WIDTH = 72
const GRID_GAP = 8

@customElement('nuxy-tool-icon-browser')
export class NuxyToolIconBrowserElement extends LitElement implements NuxyToolElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }

    .scroll {
      overflow-y: auto;
      flex: 1;
      min-height: 0;
      padding: var(--space-3);
    }

    .icon-wrap {
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text, currentColor);
      opacity: 0.65;
      flex-shrink: 0;
    }

    .icon-wrap svg {
      width: 100%;
      height: 100%;
    }

    .name {
      font-size: 9px;
      color: var(--color-text-muted, rgba(255, 255, 255, 0.45));
      text-align: center;
      word-break: break-all;
      line-height: 1.2;
      max-width: 100%;
    }

    .empty {
      padding: var(--space-6);
      text-align: center;
      color: var(--color-text-muted, rgba(255, 255, 255, 0.45));
      font-size: var(--font-sm);
    }

    .footer-portal {
      display: none;
    }
  `

  @property({ type: String })
  declare committedQuery: string

  @property({ type: String })
  declare extensionId: string

  private controller: IconBrowserController | null = null
  private _query = ''
  private _footerRegistered = false

  set query(value: string) {
    const next = value ?? ''
    if (this._query === next) return
    this._query = next
    this.controller?.setQuery(next)
  }

  get query(): string {
    return this._query
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.controller = new IconBrowserController(() => this.requestUpdate())
    this.controller.connect()
    if (this._query) this.controller.setQuery(this._query)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.controller?.disconnect()
    this.controller = null
    window.core?.shell?.setFooterPortal(null)
    this._footerRegistered = false
  }

  private onFooterRef = (el: Element | undefined): void => {
    if (!el || this._footerRegistered) return
    window.core?.shell?.setFooterPortal(el as HTMLElement)
    this._footerRegistered = true
  }

  private onActiveIndexChange = (event: CustomEvent<{ index: number }>): void => {
    this.controller?.setActiveIndex(event.detail.index)
  }

  private _footerText(): string {
    const s = this.controller?.state
    if (!s) return ''
    if (s.ready) return `${s.filtered.length} / ${s.icons.length} icons`
    return 'Loading…'
  }

  render() {
    if (!this.controller) return nothing
    const { filtered, ready, query, activeIndex } = this.controller.state
    const trimmedQuery = query.trim()

    return html`
      <span class="footer-portal" ${ref(this.onFooterRef)}>${this._footerText()}</span>
      ${!ready
        ? html`<div class="empty">Loading…</div>`
        : trimmedQuery && filtered.length === 0
          ? html`<div class="empty">No matches for "${trimmedQuery}"</div>`
          : html`
              <div class="scroll">
                <nuxy-grid
                  min-cell-width=${MIN_CELL_WIDTH}
                  gap=${GRID_GAP}
                  keyboard-nav
                  omnibar-handoff
                  .activeIndex=${activeIndex}
                  @active-index-change=${this.onActiveIndexChange}
                >
                  ${filtered.map(
                    (name, idx) => html`
                      <nuxy-grid-item .active=${idx === activeIndex} title=${name}>
                        <span class="icon-wrap"
                          >${safeSVG(this.controller!.svgCache.get(name) ?? '')}</span
                        >
                        <span class="name">${name}</span>
                      </nuxy-grid-item>
                    `
                  )}
                </nuxy-grid>
              </div>
            `}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-tool-icon-browser': NuxyToolIconBrowserElement
  }
}
