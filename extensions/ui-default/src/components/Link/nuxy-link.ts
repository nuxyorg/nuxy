import '../Text/index.css'

export class NuxyLinkElement extends HTMLElement {
  private anchor: HTMLAnchorElement | null = null

  static get observedAttributes(): string[] {
    return ['href', 'variant', 'external', 'class']
  }

  connectedCallback(): void {
    this.ensureAnchor()
    this.syncAnchor()
  }

  attributeChangedCallback(): void {
    this.syncAnchor()
  }

  private ensureAnchor(): void {
    if (this.anchor?.isConnected) return
    this.anchor = document.createElement('a')
    while (this.firstChild) {
      this.anchor.appendChild(this.firstChild)
    }
    this.appendChild(this.anchor)
  }

  private syncAnchor(): void {
    this.ensureAnchor()
    const anchor = this.anchor!
    const variant = this.getAttribute('variant') ?? 'default'
    const external = this.hasAttribute('external')
    const extraClass = this.getAttribute('class') ?? ''

    anchor.className = [
      'nuxy-link',
      variant !== 'default' ? `nuxy-link--${variant}` : '',
      extraClass,
    ]
      .filter(Boolean)
      .join(' ')

    const href = this.getAttribute('href')
    if (href) anchor.setAttribute('href', href)
    else anchor.removeAttribute('href')

    if (external) {
      anchor.target = '_blank'
      anchor.rel = 'noopener noreferrer'
    } else {
      anchor.removeAttribute('target')
      anchor.removeAttribute('rel')
    }
  }
}

if (!customElements.get('nuxy-link')) {
  customElements.define('nuxy-link', NuxyLinkElement)
}
