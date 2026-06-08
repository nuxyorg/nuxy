import { NuxyToolElement } from '@nuxy/core'
import { SettingsController } from './settings-controller.ts'
import { renderSettingsApp } from './settings-dom.ts'

const TAG = 'nuxy-tool-settings'

export class NuxyToolSettingsElement extends HTMLElement implements NuxyToolElement {
  private controller: SettingsController | null = null
  private _query = ''
  private _committedQuery = ''
  private _extensionId = ''

  connectedCallback(): void {
    this.classList.add('nuxy-tool-settings')
    this.style.display = 'flex'
    this.style.flexDirection = 'column'
    this.style.overflow = 'hidden'
    this.controller = new SettingsController(() => this.render())
    this.controller.connect()
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
    this._query = value ?? ''
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
    const app = renderSettingsApp(this.controller)
    this.replaceChildren()
    if (app) this.appendChild(app)
  }
}

export function registerNuxyToolSettings(): void {
  if (!customElements.get(TAG)) {
    customElements.define(TAG, NuxyToolSettingsElement)
  }
}

registerNuxyToolSettings()
