import type { NuxyToolElement } from '@nuxy/core'
import { h } from '../../extensions/ce-utils.ts'

const TAG = 'nuxy-tool-my-extension'

export class NuxyToolMyExtensionElement extends HTMLElement implements NuxyToolElement {
  private _query = ''
  private _committedQuery = ''
  private _extensionId = ''

  connectedCallback(): void {
    this.classList.add('nuxy-tool-my-extension')
    this.render()
  }

  disconnectedCallback(): void {
    this.replaceChildren()
  }

  get query(): string {
    return this._query
  }

  set query(value: string) {
    const next = value ?? ''
    if (this._query === next) return
    this._query = next
    this.render()
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
    this.replaceChildren(
      h(
        'div',
        { style: { padding: 'var(--space-4)' } },
        h('p', null, 'My extension — query: ', this._query || '(empty)')
      )
    )
  }
}

if (!customElements.get(TAG)) {
  customElements.define(TAG, NuxyToolMyExtensionElement)
}
