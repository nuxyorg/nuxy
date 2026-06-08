import './index.css'

const MIRROR_ATTRS = ['disabled', 'type', 'name', 'value', 'form', 'formaction', 'formenctype', 'formmethod', 'formnovalidate', 'formtarget', 'aria-label', 'aria-disabled', 'tabindex']

export class NuxyButtonElement extends HTMLElement {
  private button: HTMLButtonElement | null = null

  static get observedAttributes(): string[] {
    return ['variant', 'class', 'disabled', 'type']
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
    const variant = this.getAttribute('variant') ?? 'default'
    const extraClass = this.getAttribute('class') ?? ''
    btn.className = ['nuxy-button', `nuxy-button--${variant}`, extraClass].filter(Boolean).join(' ')

    for (const attr of MIRROR_ATTRS) {
      if (this.hasAttribute(attr)) {
        btn.setAttribute(attr, this.getAttribute(attr) ?? '')
      } else {
        btn.removeAttribute(attr)
      }
    }
  }
}

if (!customElements.get('nuxy-button')) {
  customElements.define('nuxy-button', NuxyButtonElement)
}
