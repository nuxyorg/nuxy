import './index.css'
import { syncHostClasses } from '../../h.ts'

export class NuxyCardElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['interactive']
  }

  connectedCallback(): void {
    this.sync()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private sync(): void {
    syncHostClasses(this, 'nuxy-card', this.hasAttribute('interactive') ? 'nuxy-card--interactive' : '')
  }
}

export class NuxyCardHeaderElement extends HTMLElement {
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
    syncHostClasses(this, 'nuxy-card__header')
  }
}

export class NuxyCardBodyElement extends HTMLElement {
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
    syncHostClasses(this, 'nuxy-card__body')
  }
}

export class NuxyCardFooterElement extends HTMLElement {
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
    syncHostClasses(this, 'nuxy-card__footer')
  }
}

if (!customElements.get('nuxy-card')) {
  customElements.define('nuxy-card', NuxyCardElement)
}
if (!customElements.get('nuxy-card-header')) {
  customElements.define('nuxy-card-header', NuxyCardHeaderElement)
}
if (!customElements.get('nuxy-card-body')) {
  customElements.define('nuxy-card-body', NuxyCardBodyElement)
}
if (!customElements.get('nuxy-card-footer')) {
  customElements.define('nuxy-card-footer', NuxyCardFooterElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-card': NuxyCardElement
    'nuxy-card-header': NuxyCardHeaderElement
    'nuxy-card-body': NuxyCardBodyElement
    'nuxy-card-footer': NuxyCardFooterElement
  }
}
