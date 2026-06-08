import './index.css'

export class NuxyBadgeElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['active']
  }

  connectedCallback(): void {
    this.syncClasses()
  }

  attributeChangedCallback(): void {
    this.syncClasses()
  }

  private syncClasses(): void {
    const active = this.hasAttribute('active')
    this.classList.add('nuxy-badge')
    this.classList.toggle('nuxy-badge--active', active)
    this.classList.toggle('nuxy-badge--inactive', !active)
  }
}

if (!customElements.get('nuxy-badge')) {
  customElements.define('nuxy-badge', NuxyBadgeElement)
}
