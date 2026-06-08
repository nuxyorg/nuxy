import './index.css'

const MIRROR_ATTRS = ['disabled', 'type', 'aria-label', 'aria-disabled', 'tabindex', 'title']

export class NuxyIconButtonElement extends HTMLElement {
  private button: HTMLButtonElement | null = null

  static get observedAttributes(): string[] {
    return ['size', 'variant', 'class', 'disabled', 'type']
  }

  connectedCallback(): void {
    this.style.display = 'contents'
    this.ensureButton()
    this.sync()
  }

  attributeChangedCallback(): void {
    this.sync()
  }

  private ensureButton(): void {
    if (this.button?.isConnected) return
    this.button = document.createElement('button')
    while (this.firstChild) {
      this.button.appendChild(this.firstChild)
    }
    this.appendChild(this.button)
  }

  private sync(): void {
    this.ensureButton()
    const btn = this.button!
    const size = this.getAttribute('size') ?? 'md'
    const variant = this.getAttribute('variant') ?? 'default'
    const extraClass = this.getAttribute('class') ?? ''

    btn.className = [
      'nuxy-icon-button',
      `nuxy-icon-button--${size}`,
      variant !== 'default' ? `nuxy-icon-button--${variant}` : '',
      extraClass,
    ]
      .filter(Boolean)
      .join(' ')

    for (const attr of MIRROR_ATTRS) {
      if (this.hasAttribute(attr)) {
        btn.setAttribute(attr, this.getAttribute(attr) ?? '')
      } else {
        btn.removeAttribute(attr)
      }
    }
  }
}

if (!customElements.get('nuxy-icon-button')) {
  customElements.define('nuxy-icon-button', NuxyIconButtonElement)
}
