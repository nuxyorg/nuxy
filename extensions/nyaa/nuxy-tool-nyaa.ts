import type { NuxyToolElement } from '@nuxy/core'
import { NyaaController } from './nyaa-controller.ts'
import { renderNyaaApp } from './nyaa-dom.ts'

const TAG = 'nuxy-tool-nyaa'

export class NuxyToolNyaaElement extends HTMLElement implements NuxyToolElement {
  private controller: NyaaController | null = null
  private _query = ''
  private _committedQuery = ''
  private _extensionId = ''

  connectedCallback(): void {
    this.classList.add('nuxy-tool-nyaa')
    this.controller = new NyaaController(() => this.render())
    this.controller.connect()
    if (this._query) this.controller.setQuery(this._query)
    this.render()
  }

  disconnectedCallback(): void {
    this.controller?.disconnect()
    this.controller = null
    this.replaceChildren()
  }

  get query(): string {
    return this._query
  }

  set query(value: string) {
    const next = value ?? ''
    if (this._query === next) return
    this._query = next
    this.controller?.setQuery(next)
  }

  get committedQuery(): string {
    return this._committedQuery
  }

  set committedQuery(value: string) {
    this._committedQuery = value ?? ''
  }

  get extensionId(): string {
    return this._extensionId
  }

  set extensionId(value: string) {
    this._extensionId = value ?? ''
  }

  private render(): void {
    if (!this.controller) return
    this.replaceChildren(renderNyaaApp(this.controller))
  }
}

export function registerNuxyToolNyaa(): void {
  if (!customElements.get(TAG)) {
    customElements.define(TAG, NuxyToolNyaaElement)
  }
}

registerNuxyToolNyaa()
