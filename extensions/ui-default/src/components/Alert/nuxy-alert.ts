import './index.css'

export class NuxyAlertElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['variant']
  }

  connectedCallback(): void {
    this.syncClasses()
  }

  attributeChangedCallback(): void {
    this.syncClasses()
  }

  private syncClasses(): void {
    const variant = this.getAttribute('variant') ?? 'info'
    this.className = ['nuxy-alert', `nuxy-alert--${variant}`].join(' ')
  }
}

if (!customElements.get('nuxy-alert')) {
  customElements.define('nuxy-alert', NuxyAlertElement)
}
