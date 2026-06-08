import './index.css'
import { syncHostClasses } from '../../h.ts'

export class NuxyListItemActionsElement extends HTMLElement {
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
    syncHostClasses(this, 'nuxy-list-item-actions')
  }
}

if (!customElements.get('nuxy-list-item-actions')) {
  customElements.define('nuxy-list-item-actions', NuxyListItemActionsElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-list-item-actions': NuxyListItemActionsElement
  }
}
