import './index.css'

const ALLOWED_TAGS = new Set(['p', 'span', 'div', 'label', 'small', 'strong', 'em'])

export class NuxyTextElement extends HTMLElement {
  private inner: HTMLElement | null = null

  static get observedAttributes(): string[] {
    return ['as', 'size', 'variant', 'bold', 'mono', 'class']
  }

  connectedCallback(): void {
    this.ensureInner()
    this.syncClasses()
  }

  attributeChangedCallback(name: string): void {
    if (name === 'as') {
      this.ensureInner(true)
    }
    this.syncClasses()
  }

  private ensureInner(rebuild = false): void {
    const as = this.getAttribute('as') ?? 'p'
    const tag = ALLOWED_TAGS.has(as) ? as : 'p'

    if (this.inner && !rebuild && this.inner.tagName.toLowerCase() === tag) return

    const next = document.createElement(tag)
    const source = this.inner ?? this
    while (source.firstChild) {
      next.appendChild(source.firstChild)
    }
    if (this.inner) {
      this.inner.replaceWith(next)
    } else {
      this.replaceChildren(next)
    }
    this.inner = next
  }

  private syncClasses(): void {
    this.ensureInner()
    if (!this.inner) return

    const size = this.getAttribute('size') ?? 'md'
    const variant = this.getAttribute('variant') ?? 'default'
    const extraClass = this.getAttribute('class') ?? ''

    this.inner.className = [
      'nuxy-text',
      `nuxy-text--${size}`,
      variant !== 'default' ? `nuxy-text--${variant}` : '',
      this.hasAttribute('bold') ? 'nuxy-text--bold' : '',
      this.hasAttribute('mono') ? 'nuxy-text--mono' : '',
      extraClass,
    ]
      .filter(Boolean)
      .join(' ')
  }
}

if (!customElements.get('nuxy-text')) {
  customElements.define('nuxy-text', NuxyTextElement)
}
