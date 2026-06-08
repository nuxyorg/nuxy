import './index.css'
import { syncHostClasses } from '../../h.ts'

export class NuxyStackElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['direction', 'gap', 'align', 'justify', 'wrap']
  }

  connectedCallback(): void {
    this.sync()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private sync(): void {
    const direction = this.getAttribute('direction') ?? 'vertical'
    const align = this.getAttribute('align')
    const justify = this.getAttribute('justify')
    const extraClass = this.getAttribute('class') ?? ''
    const gap = this.getAttribute('gap')

    syncHostClasses(this, 'nuxy-stack', `nuxy-stack--${direction}`, align ? `nuxy-stack--align-${align}` : '', justify ? `nuxy-stack--justify-${justify}` : '', this.hasAttribute('wrap') ? 'nuxy-stack--wrap' : '')

    if (gap) this.style.gap = /^\d+$/.test(gap) ? `${gap}px` : gap
    else this.style.removeProperty('gap')
  }
}

if (!customElements.get('nuxy-stack')) {
  customElements.define('nuxy-stack', NuxyStackElement)
}
