import './index.css'
import { syncHostClasses } from '../../h.ts'

export class NuxyItemLeadingElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['size', 'color']
  }

  connectedCallback(): void {
    this.sync()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private sync(): void {
    const size = this.getAttribute('size') ?? 'md'
    const color = this.getAttribute('color')
    const extraClass = this.getAttribute('class') ?? ''

    syncHostClasses(this, 'nuxy-item-leading', `nuxy-item-leading--${size}`)

    if (color) this.style.background = color
    else this.style.removeProperty('background')
  }
}

if (!customElements.get('nuxy-item-leading')) {
  customElements.define('nuxy-item-leading', NuxyItemLeadingElement)
}
