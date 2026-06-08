import './index.css'
import { syncHostClasses } from '../../h.ts'
import { smoothScrollIntoViewIfNeeded } from '../../utils/scroll'

const MIRROR_ATTRS = [
  'disabled',
  'type',
  'title',
  'aria-label',
  'tabindex',
]

export class NuxyGridElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['cols', 'gap']
  }

  connectedCallback(): void {
    this.sync()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private sync(): void {
    const cols = this.getAttribute('cols') ?? '9'
    const gap = this.getAttribute('gap') ?? '4'
    const extraClass = this.getAttribute('class') ?? ''

    syncHostClasses(this, 'nuxy-grid')
    this.style.display = 'grid'
    this.style.gridTemplateColumns = `repeat(${cols}, 1fr)`
    this.style.gap = `${gap}px`
  }
}

export class NuxyGridItemElement extends HTMLElement {
  private button: HTMLButtonElement | null = null

  static get observedAttributes(): string[] {
    return ['active']
  }

  connectedCallback(): void {
    this.style.display = 'contents'
    this.ensureButton()
    this.sync()
  }

  attributeChangedCallback(name: string): void {
    this.sync()
    if (name === 'active' && this.hasAttribute('active') && this.button) {
      smoothScrollIntoViewIfNeeded(this.button)
    }
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
    const extraClass = this.getAttribute('class') ?? ''

    btn.className = [
      'nuxy-grid-item',
      this.hasAttribute('active') ? 'nuxy-grid-item--active' : '',
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

if (!customElements.get('nuxy-grid')) {
  customElements.define('nuxy-grid', NuxyGridElement)
}
if (!customElements.get('nuxy-grid-item')) {
  customElements.define('nuxy-grid-item', NuxyGridItemElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-grid': NuxyGridElement
    'nuxy-grid-item': NuxyGridItemElement
  }
}
