import './index.css'
import { syncHostClasses } from '../../h.ts'

const variantClasses: Record<string, string> = {
  default: '',
  success: 'nuxy-list-item-text--success',
}

export class NuxyListItemTextElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['variant']
  }

  connectedCallback(): void {
    this.sync()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private sync(): void {
    const variant = this.getAttribute('variant') ?? 'default'
    const extraClass = this.getAttribute('class') ?? ''

    syncHostClasses(this, 'nuxy-list-item-text', variantClasses[variant] ?? '')
  }
}

if (!customElements.get('nuxy-list-item-text')) {
  customElements.define('nuxy-list-item-text', NuxyListItemTextElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-list-item-text': NuxyListItemTextElement
  }
}
