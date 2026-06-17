import { LitElement, html, css, nothing, customElement, property, state } from '@nuxyorg/core'
import type { NuxyToolElement } from '@nuxyorg/core'

async function loadFrontendModule(extId: string): Promise<void> {
  const dynamicImport = new Function('url', 'return import(url)')
  await dynamicImport(`nuxy-ext://${extId}/frontend.js`)
}

@customElement('nuxy-tool-host')
export class NuxyToolHostElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;
    }

    slot {
      flex: 1 1 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    ::slotted(*) {
      display: flex;
      flex-direction: column;
      flex: 1 1 0;
      min-height: 0;
      overflow: hidden;
    }
  `
  private _extensionId: string | null = null
  private _query = ''
  private _committedQuery = ''
  private toolEl: NuxyToolElement | null = null
  private swapGeneration = 0
  private _loadingTimer: ReturnType<typeof setTimeout> | null = null

  @property({ type: Boolean, reflect: true })
  declare loading: boolean
  @property({ attribute: 'loading-message' })
  declare loadingMessage: string
  @state()
  declare private _showLoading: boolean

  connectedCallback(): void {
    super.connectedCallback()
    this._showLoading = false
    if (this._extensionId) {
      void this.swapTool(this._extensionId)
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.teardown()
  }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has('loading')) {
      if (this.loading) {
        this._loadingTimer = setTimeout(() => {
          this._loadingTimer = null
          this._showLoading = true
        }, 1000)
      } else {
        if (this._loadingTimer !== null) {
          clearTimeout(this._loadingTimer)
          this._loadingTimer = null
        }
        this._showLoading = false
      }
    }
  }

  // Tool content is managed imperatively via swapTool (light DOM children shown via slot)
  render() {
    return html`
      ${this._showLoading
        ? html`<nuxy-loading-state
            message=${this.loadingMessage || 'Loading…'}
            min-height="200px"
          ></nuxy-loading-state>`
        : nothing}
      <slot></slot>
    `
  }

  get extensionId(): string | null {
    return this._extensionId
  }

  set extensionId(id: string | null) {
    const next = id || null
    if (this._extensionId === next) return
    this._extensionId = next
    if (this.isConnected) void this.swapTool(next)
  }

  get query(): string {
    return this._query
  }

  set query(value: string) {
    const next = value ?? ''
    if (this._query === next) return
    this._query = next
    this.syncToolProps()
  }

  get committedQuery(): string {
    return this._committedQuery
  }

  set committedQuery(value: string) {
    const next = value ?? ''
    if (this._committedQuery === next) return
    this._committedQuery = next
    this.syncToolProps()
  }

  private syncToolProps() {
    if (this.toolEl) {
      this.toolEl.query = this._query
      this.toolEl.committedQuery = this._committedQuery
    }
  }

  private teardown() {
    this.swapGeneration += 1
    if (this._loadingTimer !== null) {
      clearTimeout(this._loadingTimer)
      this._loadingTimer = null
    }
    this._showLoading = false
    this.toolEl?.onToolDeactivate?.()
    this.toolEl = null
    this.replaceChildren()
    this.loading = false
  }

  private async swapTool(extId: string | null) {
    this.teardown()
    if (!extId) return

    const generation = ++this.swapGeneration
    this.loading = true

    try {
      await loadFrontendModule(extId)
      if (generation !== this.swapGeneration) return

      const tag = (await window.core?.tools?.resolveElementTag(extId)) ?? null
      if (generation !== this.swapGeneration) return

      if (tag) {
        if (!customElements.get(tag)) {
          this.loading = false
          console.warn(`[nuxy-tool-host] Custom element "${tag}" is not registered for "${extId}"`)
          return
        }

        const Ctor = customElements.get(tag) as CustomElementConstructor
        const el = new Ctor() as unknown as HTMLElement & NuxyToolElement
        el.extensionId = extId
        el.query = this._query
        el.committedQuery = this._committedQuery
        this.loading = false
        this.appendChild(el)
        this.toolEl = el
        window.core?.shell?.refreshKeyHints()

        const composition = window.core?.composition
        if (composition && el.onToolActivate) {
          await el.onToolActivate({
            extensionId: extId,
            query: this._query,
            composition,
          })
        }
        return
      }

      this.loading = false
      console.warn(`[nuxy-tool-host] Tool "${extId}" has no entry.element in manifest`)
    } catch (err) {
      if (generation !== this.swapGeneration) return
      this.loading = false
      console.warn(`[nuxy-tool-host] Failed to load tool "${extId}":`, err)
    }
  }
}
