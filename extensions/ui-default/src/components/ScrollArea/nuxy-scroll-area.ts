import './index.css'
import { syncHostClasses } from '../../h.ts'

export class NuxyScrollAreaElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['axis', 'max-height', 'max-width']
  }

  connectedCallback(): void {
    this.sync()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private sync(): void {
    const axis = this.getAttribute('axis') ?? 'y'
    const maxHeight = this.getAttribute('max-height')
    const maxWidth = this.getAttribute('max-width')
    const extraClass = this.getAttribute('class') ?? ''

    syncHostClasses(this, 'nuxy-scroll-area', axis !== 'both' ? `nuxy-scroll-area--${axis}` : '')

    if (maxHeight) {
      this.style.maxHeight = /^\d+$/.test(maxHeight) ? `${maxHeight}px` : maxHeight
    } else {
      this.style.removeProperty('max-height')
    }

    if (maxWidth) {
      this.style.maxWidth = /^\d+$/.test(maxWidth) ? `${maxWidth}px` : maxWidth
    } else {
      this.style.removeProperty('max-width')
    }
  }
}

if (!customElements.get('nuxy-scroll-area')) {
  customElements.define('nuxy-scroll-area', NuxyScrollAreaElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-scroll-area': NuxyScrollAreaElement
  }
}
