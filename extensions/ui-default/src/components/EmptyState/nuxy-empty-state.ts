import './index.css'

export class NuxyEmptyStateElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['title', 'message', 'hint', 'error', 'page']
  }

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render()
  }

  private render(): void {
    const page = this.hasAttribute('page')
    this.className = ['nuxy-empty-state', page ? 'nuxy-empty-state--page' : ''].filter(Boolean).join(' ')

    const title = this.getAttribute('title')
    const message = this.getAttribute('message')
    const hint = this.getAttribute('hint')
    const error = this.getAttribute('error')

    const slotNodes = [...this.childNodes]
    this.replaceChildren()

    if (title) {
      const h2 = document.createElement('h2')
      h2.className = 'nuxy-empty-state__title'
      h2.textContent = title
      this.appendChild(h2)
    }
    if (message) {
      const p = document.createElement('p')
      p.className = 'nuxy-empty-state__message'
      p.textContent = message
      this.appendChild(p)
    }
    if (hint) {
      const p = document.createElement('p')
      p.className = 'nuxy-empty-state__hint'
      p.textContent = hint
      this.appendChild(p)
    }
    if (error) {
      const p = document.createElement('p')
      p.className = 'nuxy-empty-state__error'
      p.textContent = error
      this.appendChild(p)
    }
    for (const node of slotNodes) {
      this.appendChild(node)
    }
  }
}

if (!customElements.get('nuxy-empty-state')) {
  customElements.define('nuxy-empty-state', NuxyEmptyStateElement)
}
