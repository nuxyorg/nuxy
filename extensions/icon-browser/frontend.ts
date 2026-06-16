import {
  LitElement,
  html,
  css,
  nothing,
  customElement,
  property,
  state,
  unsafeSVG,
} from '@nuxyorg/core'
import type { NuxyToolElement } from '@nuxyorg/core'

@customElement('nuxy-tool-icon-browser')
export class NuxyToolIconBrowserElement extends LitElement implements NuxyToolElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
      gap: var(--space-1);
      overflow-y: auto;
      flex: 1;
      min-height: 0;
      padding: var(--space-3);
    }

    .cell {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-2) var(--space-1);
      border-radius: var(--radius-md);
      cursor: default;
      transition: background 0.1s;
    }

    .cell:hover {
      background: var(--color-surface-hover, rgba(255, 255, 255, 0.06));
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
      width: 22px;
      height: 22px;
      display: block;
    }

    .name {
      font-size: 9px;
      opacity: 0.5;
      text-align: center;
      word-break: break-all;
      line-height: 1.3;
      font-family: var(--font-mono, monospace);
      max-width: 100%;
    }

    .empty {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      opacity: 0.4;
      font-size: var(--font-size-sm);
    }
  `

  @property({ type: String })
  declare extensionId: string

  @property({ type: String })
  declare committedQuery: string

  @state() declare private _icons: string[] | null
  @state() declare private _filter: string
  @state() declare private _ready: boolean

  private _rawQuery = ''
  private _extId: string | null = null
  private _svgCache = new Map<string, string>()
  private _footerEl = document.createElement('span')

  set query(value: string) {
    this._rawQuery = value ?? ''
    this._filter = this._rawQuery.trim().toLowerCase()
  }

  get query(): string {
    return this._rawQuery
  }

  connectedCallback(): void {
    super.connectedCallback()
    window.core?.shell?.setFooterPortal(this._footerEl)
    this._updateFooter()
    void this._load()
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    window.core?.shell?.setFooterPortal(null)
  }

  protected updated(changedProperties: Map<PropertyKey, unknown>): void {
    super.updated(changedProperties)
    this._updateFooter()
  }

  private _updateFooter(): void {
    if (!window.core?.shell) return
    const all = this._icons ?? []
    const icons = this._filter ? all.filter((n) => n.includes(this._filter)) : all
    if (this._ready) {
      this._footerEl.textContent = `${icons.length} / ${all.length} icons`
    } else {
      this._footerEl.textContent = 'Loading…'
    }
  }

  private async _load(): Promise<void> {
    try {
      const res = (await window.core?.ipc?.invoke('kernel', 'getIconPack', {})) as
        | { success: boolean; data?: { extId?: string; icons?: unknown } }
        | null
        | undefined
      const data = res?.success ? res.data : undefined
      if (res?.success && data) {
        this._extId = data.extId ?? null
        if (Array.isArray(data.icons)) {
          this._icons = [...(data.icons as string[])].sort()
          if (this._extId) {
            await this._fetchAllSvgs(this._icons, this._extId)
          }
        } else {
          this._icons = []
        }
      } else {
        this._icons = []
      }
    } catch {
      this._icons = []
    }
    this._ready = true
  }

  private async _fetchAllSvgs(names: string[], extId: string): Promise<void> {
    await Promise.all(
      names.map(async (name) => {
        try {
          const res = await fetch(`nuxy-ext://${extId}/icons/${name}.svg`)
          if (res.ok) {
            this._svgCache.set(name, await res.text())
          }
        } catch {
          // ignore failed icons
        }
      })
    )
  }

  render() {
    const all = this._icons ?? []
    const icons = this._filter ? all.filter((n) => n.includes(this._filter)) : all

    return html`
      ${!this._ready
        ? html`<div class="empty">Loading…</div>`
        : this._filter && icons.length === 0
          ? html`<div class="empty">No icons match "${this._filter}"</div>`
          : html`
              <div class="grid">
                ${icons.map(
                  (name) => html`
                    <div class="cell" title=${name}>
                      <span class="icon-wrap">${unsafeSVG(this._svgCache.get(name) ?? '')}</span>
                      <span class="name">${name}</span>
                    </div>
                  `
                )}
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

