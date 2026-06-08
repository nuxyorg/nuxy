import '../Spinner/nuxy-spinner.ts'

export class NuxyLoadingStateElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['message', 'size', 'min-height']
  }

  connectedCallback(): void {
    this.classList.add('nuxy-loading-state')
    if (!this.hasAttribute('role')) this.setAttribute('role', 'status')
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render()
  }

  private render(): void {
    const message = this.getAttribute('message')
    const size = this.getAttribute('size') ?? 'md'
    const minHeight = this.getAttribute('min-height') ?? '200px'

    this.style.display = 'flex'
    this.style.flexDirection = 'column'
    this.style.alignItems = 'center'
    this.style.justifyContent = 'center'
    this.style.flex = '1'
    this.style.minHeight = minHeight
    this.style.gap = 'var(--space-3)'
    this.setAttribute('aria-label', message || 'Loading')

    this.replaceChildren()

    const spinner = document.createElement('nuxy-spinner')
    spinner.setAttribute('size', size)
    spinner.setAttribute('aria-label', message || 'Loading')
    this.appendChild(spinner)

    if (message) {
      const span = document.createElement('span')
      span.textContent = message
      span.style.fontSize = 'var(--font-sm)'
      span.style.color = 'var(--text-muted)'
      span.style.opacity = '0.75'
      this.appendChild(span)
    }
  }
}

if (!customElements.get('nuxy-loading-state')) {
  customElements.define('nuxy-loading-state', NuxyLoadingStateElement)
}
