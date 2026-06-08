import { syncHostClasses } from '../../h.ts'
export class NuxyBoxElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['display', 'padding', 'margin', 'gap', 'flex']
  }

  connectedCallback(): void {
    this.classList.add('nuxy-box')
    this.sync()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private toPx(value: string | null): string | undefined {
    if (!value) return undefined
    return /^\d+$/.test(value) ? `${value}px` : value
  }

  private sync(): void {
    syncHostClasses(this, 'nuxy-box')

    const display = this.getAttribute('display')
    const padding = this.toPx(this.getAttribute('padding'))
    const margin = this.toPx(this.getAttribute('margin'))
    const gap = this.toPx(this.getAttribute('gap'))
    const flex = this.getAttribute('flex')

    if (display) this.style.display = display
    else this.style.removeProperty('display')
    if (padding) this.style.padding = padding
    else this.style.removeProperty('padding')
    if (margin) this.style.margin = margin
    else this.style.removeProperty('margin')
    if (gap) this.style.gap = gap
    else this.style.removeProperty('gap')
    if (flex) this.style.flex = flex
    else this.style.removeProperty('flex')
  }
}

if (!customElements.get('nuxy-box')) {
  customElements.define('nuxy-box', NuxyBoxElement)
}
