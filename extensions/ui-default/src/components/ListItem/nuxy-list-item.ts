import './index.css'
import { syncHostClasses } from '../../h.ts'
import { smoothScrollIntoViewIfNeeded } from '../../utils/scroll'

export class NuxyListItemElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['active']
  }

  connectedCallback(): void {
    this.sync()
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return
    this.sync()
    if (name === 'active' && this.hasAttribute('active')) {
      smoothScrollIntoViewIfNeeded(this)
    }
  }

  private sync(): void {
    this.classList.toggle('nuxy-list-item--active', this.hasAttribute('active'))
    syncHostClasses(this, 'nuxy-list-item')
  }
}

if (!customElements.get('nuxy-list-item')) {
  customElements.define('nuxy-list-item', NuxyListItemElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-list-item': NuxyListItemElement
  }
}
