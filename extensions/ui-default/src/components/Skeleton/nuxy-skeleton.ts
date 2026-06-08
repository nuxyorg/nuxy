import '../ProgressBar/index.css'

export class NuxySkeletonElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['width', 'height', 'variant']
  }

  connectedCallback(): void {
    this.classList.add('nuxy-skeleton')
    if (!this.hasAttribute('aria-hidden')) this.setAttribute('aria-hidden', 'true')
    this.sync()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private sync(): void {
    const variant = this.getAttribute('variant') ?? 'rect'
    this.classList.toggle('nuxy-skeleton--text', variant === 'text')
    this.classList.toggle('nuxy-skeleton--circle', variant === 'circle')

    const width = this.getAttribute('width')
    const height = this.getAttribute('height')
    if (width) this.style.width = /^\d+$/.test(width) ? `${width}px` : width
    else this.style.removeProperty('width')
    if (height) this.style.height = /^\d+$/.test(height) ? `${height}px` : height
    else this.style.removeProperty('height')
  }
}

if (!customElements.get('nuxy-skeleton')) {
  customElements.define('nuxy-skeleton', NuxySkeletonElement)
}
