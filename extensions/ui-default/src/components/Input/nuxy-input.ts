import './index.css'

const MIRROR_ATTRS = [
  'type',
  'name',
  'value',
  'placeholder',
  'disabled',
  'readonly',
  'required',
  'autocomplete',
  'autofocus',
  'min',
  'max',
  'step',
  'pattern',
  'inputmode',
  'id',
  'aria-label',
  'aria-invalid',
  'tabindex',
]

export class NuxyInputElement extends HTMLElement {
  private input: HTMLInputElement | null = null

  static get observedAttributes(): string[] {
    return ['class', ...MIRROR_ATTRS]
  }

  connectedCallback(): void {
    this.style.display = 'contents'
    this.ensureInput()
    this.sync()
  }

  attributeChangedCallback(): void {
    this.sync()
  }

  private ensureInput(): void {
    if (this.input?.isConnected) return
    this.input = document.createElement('input')
    this.input.className = 'nuxy-input'
    this.appendChild(this.input)
  }

  private sync(): void {
    this.ensureInput()
    const input = this.input!
    const extraClass = this.getAttribute('class')
    input.className = ['nuxy-input', extraClass ?? ''].filter(Boolean).join(' ')

    for (const attr of MIRROR_ATTRS) {
      if (this.hasAttribute(attr)) {
        input.setAttribute(attr, this.getAttribute(attr) ?? '')
      } else {
        input.removeAttribute(attr)
      }
    }
  }

  /** Used by React ref forwarding */
  get nativeInput(): HTMLInputElement | null {
    return this.input
  }
}

if (!customElements.get('nuxy-input')) {
  customElements.define('nuxy-input', NuxyInputElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-input': NuxyInputElement
  }
}
