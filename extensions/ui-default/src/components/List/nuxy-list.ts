import './index.css'
import { syncHostClasses } from '../../h.ts'

const maxHeightClasses: Record<string, string> = {
  md: 'nuxy-list--max-h-md',
}

export class NuxyListElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['max-height']
  }

  connectedCallback(): void {
    this.sync()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private sync(): void {
    const maxHeight = this.getAttribute('max-height')
    const extraClass = this.getAttribute('class') ?? ''
    const heightClass = maxHeight ? maxHeightClasses[maxHeight] ?? '' : ''

    syncHostClasses(this, 'nuxy-list', heightClass)
  }
}

if (!customElements.get('nuxy-list')) {
  customElements.define('nuxy-list', NuxyListElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-list': NuxyListElement
  }
}
