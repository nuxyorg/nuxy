import './index.css'
import { syncHostClasses } from '../../h.ts'

export class NuxyListItemBodyElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['class']
  }

  connectedCallback(): void {
    this.sync()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private sync(): void {
    syncHostClasses(this, 'nuxy-list-item-body')
  }
}

if (!customElements.get('nuxy-list-item-body')) {
  customElements.define('nuxy-list-item-body', NuxyListItemBodyElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-list-item-body': NuxyListItemBodyElement
  }
}
