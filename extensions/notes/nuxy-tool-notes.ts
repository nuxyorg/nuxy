import type { NuxyToolElement } from '@nuxy/core'
import { NotesController } from './notes-controller.ts'
import { renderNotesApp } from './notes-dom.ts'

const TAG = 'nuxy-tool-notes'

export class NuxyToolNotesElement extends HTMLElement implements NuxyToolElement {
  private controller: NotesController | null = null
  private _query = ''
  private _committedQuery = ''
  private _extensionId = ''

  connectedCallback(): void {
    this.classList.add('nuxy-tool-notes')
    this.controller = new NotesController(() => this.render())
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
    this.replaceChildren(renderNotesApp(this.controller))
  }
}

export function registerNuxyToolNotes(): void {
  if (!customElements.get(TAG)) {
    customElements.define(TAG, NuxyToolNotesElement)
  }
}

registerNuxyToolNotes()
