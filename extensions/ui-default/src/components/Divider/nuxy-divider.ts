import './index.css'

export class NuxyDividerElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['orientation', 'label']
  }

  connectedCallback(): void {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'separator')
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render()
  }

  private render(): void {
    const label = this.getAttribute('label')
    const orientation = this.getAttribute('orientation') ?? 'horizontal'
    this.replaceChildren()

    if (label) {
      this.className = 'nuxy-divider nuxy-divider--label'
      const span = document.createElement('span')
      span.className = 'nuxy-divider__label-text'
      span.textContent = label
      this.appendChild(span)
      return
    }

    if (orientation === 'vertical') {
      this.className = 'nuxy-divider nuxy-divider--vertical'
      return
    }

    this.className = 'nuxy-divider'
  }
}

if (!customElements.get('nuxy-divider')) {
  customElements.define('nuxy-divider', NuxyDividerElement)
}
