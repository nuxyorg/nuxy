import './index.css'

export class NuxyLabelElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['required']
  }

  connectedCallback(): void {
    this.syncClasses()
  }

  attributeChangedCallback(): void {
    this.syncClasses()
  }

  private syncClasses(): void {
    this.classList.add('nuxy-label')
    this.classList.toggle('nuxy-label--required', this.hasAttribute('required'))
  }
}

export class NuxyHelperTextElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['variant']
  }

  connectedCallback(): void {
    this.syncClasses()
  }

  attributeChangedCallback(): void {
    this.syncClasses()
  }

  private syncClasses(): void {
    const variant = this.getAttribute('variant') ?? 'default'
    this.classList.add('nuxy-helper-text')
    this.classList.toggle('nuxy-helper-text--error', variant === 'error')
    this.classList.toggle('nuxy-helper-text--success', variant === 'success')
  }
}

if (!customElements.get('nuxy-label')) {
  customElements.define('nuxy-label', NuxyLabelElement)
}
if (!customElements.get('nuxy-helper-text')) {
  customElements.define('nuxy-helper-text', NuxyHelperTextElement)
}
