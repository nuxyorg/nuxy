import { LitElement, html, css, customElement } from '@nuxy/core'
import type { NuxyToolElement, ToolActivateContext } from '@nuxy/core'

declare global {
  interface Window {
    core?: {
      tools?: {
        resolveElementTag: (extId: string) => Promise<string | null>
      }
      composition?: Pick<ToolActivateContext['composition'], 'mount' | 'setState'>
    }
  }
}

const LOADING_CLASS = 'nuxy-tool-host--loading'

async function loadFrontendModule(extId: string): Promise<void> {
  const dynamicImport = new Function('url', 'return import(url)')
  await dynamicImport(`nuxy-ext://${extId}/frontend.js`)
}

@customElement('nuxy-tool-host')
export class NuxyToolHostElement extends LitElement {
  static styles = css`
    :host {
      display: contents;
    }
  `
  private _extensionId: string | null = null
  private _query = ''
  private _committedQuery = ''
  private toolEl: NuxyToolElement | null = null
  private swapGeneration = 0

  connectedCallback(): void {
    super.connectedCallback()
    this.classList.add('nuxy-tool-host')
    if (this._extensionId) {
      void this.swapTool(this._extensionId)
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.teardown()
  }

  // Tool content is managed imperatively via swapTool (light DOM children shown via slot)
  render() {
    return html`<slot></slot>`
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
    this.toolEl?.onToolDeactivate?.()
    this.toolEl = null
    this.replaceChildren()
    this.classList.remove(LOADING_CLASS)
  }

  private async swapTool(extId: string | null) {
    this.teardown()
    if (!extId) return

    const generation = ++this.swapGeneration
    this.classList.add(LOADING_CLASS)

    try {
      await loadFrontendModule(extId)
      if (generation !== this.swapGeneration) return

      const tag = (await window.core?.tools?.resolveElementTag(extId)) ?? null
      if (generation !== this.swapGeneration) return

      if (tag) {
        if (!customElements.get(tag)) {
          this.classList.remove(LOADING_CLASS)
          console.warn(`[nuxy-tool-host] Custom element "${tag}" is not registered for "${extId}"`)
          return
        }

        const el = document.createElement(tag) as NuxyToolElement
        el.extensionId = extId
        el.query = this._query
        el.committedQuery = this._committedQuery
        this.classList.remove(LOADING_CLASS)
        this.appendChild(el)
        this.toolEl = el

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

      this.classList.remove(LOADING_CLASS)
      console.warn(`[nuxy-tool-host] Tool "${extId}" has no entry.element in manifest`)
    } catch (err) {
      if (generation !== this.swapGeneration) return
      this.classList.remove(LOADING_CLASS)
      console.warn(`[nuxy-tool-host] Failed to load tool "${extId}":`, err)
    }
  }
}
