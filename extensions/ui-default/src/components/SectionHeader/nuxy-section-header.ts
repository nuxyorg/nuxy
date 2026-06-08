import './index.css'

export class NuxySectionHeaderElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['label', 'description']
  }

  connectedCallback(): void {
    this.classList.add('nuxy-section-header')
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render()
  }

  private render(): void {
    const label = this.getAttribute('label') ?? ''
    const description = this.getAttribute('description')
    this.replaceChildren()

    const labelEl = document.createElement('span')
    labelEl.className = 'nuxy-section-header__label'
    labelEl.textContent = label
    this.appendChild(labelEl)

    if (description) {
      const descEl = document.createElement('span')
      descEl.className = 'nuxy-section-header__desc'
      descEl.textContent = description
      this.appendChild(descEl)
    }
  }
}

if (!customElements.get('nuxy-section-header')) {
  customElements.define('nuxy-section-header', NuxySectionHeaderElement)
}
