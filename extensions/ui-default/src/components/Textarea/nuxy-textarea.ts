import './index.css'

const MIRROR_ATTRS = [
  'name',
  'value',
  'placeholder',
  'disabled',
  'readonly',
  'required',
  'autofocus',
  'rows',
  'cols',
  'maxlength',
  'minlength',
  'id',
  'aria-label',
  'aria-invalid',
  'tabindex',
]

export class NuxyTextareaElement extends HTMLElement {
  private textarea: HTMLTextAreaElement | null = null

  static get observedAttributes(): string[] {
    return ['class', ...MIRROR_ATTRS]
  }

  connectedCallback(): void {
    this.style.display = 'contents'
    this.ensureTextarea()
    this.sync()
  }

  attributeChangedCallback(): void {
    this.sync()
  }

  private ensureTextarea(): void {
    if (this.textarea?.isConnected) return
    this.textarea = document.createElement('textarea')
    this.textarea.className = 'nuxy-textarea'
    this.appendChild(this.textarea)
  }

  private sync(): void {
    this.ensureTextarea()
    const textarea = this.textarea!
    const extraClass = this.getAttribute('class')
    textarea.className = ['nuxy-textarea', extraClass ?? ''].filter(Boolean).join(' ')

    for (const attr of MIRROR_ATTRS) {
      if (this.hasAttribute(attr)) {
        textarea.setAttribute(attr, this.getAttribute(attr) ?? '')
      } else {
        textarea.removeAttribute(attr)
      }
    }
  }

  get nativeTextarea(): HTMLTextAreaElement | null {
    return this.textarea
  }
}

if (!customElements.get('nuxy-textarea')) {
  customElements.define('nuxy-textarea', NuxyTextareaElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-textarea': NuxyTextareaElement
  }
}
