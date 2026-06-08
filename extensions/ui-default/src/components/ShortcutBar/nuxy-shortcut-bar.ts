import './index.css'
import { syncHostClasses } from '../../h.ts'

export class NuxyShortcutBarElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return []
  }

  connectedCallback(): void {
    this.sync()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private sync(): void {
    syncHostClasses(this, 'nuxy-shortcut-bar')
  }
}

if (!customElements.get('nuxy-shortcut-bar')) {
  customElements.define('nuxy-shortcut-bar', NuxyShortcutBarElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-shortcut-bar': NuxyShortcutBarElement
  }
}
