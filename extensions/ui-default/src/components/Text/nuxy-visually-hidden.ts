export class NuxyVisuallyHiddenElement extends HTMLElement {
  connectedCallback(): void {
    this.style.border = '0'
    this.style.clip = 'rect(0 0 0 0)'
    this.style.height = '1px'
    this.style.margin = '-1px'
    this.style.overflow = 'hidden'
    this.style.padding = '0'
    this.style.position = 'absolute'
    this.style.width = '1px'
    this.style.whiteSpace = 'nowrap'
    this.style.wordWrap = 'normal'
  }
}

if (!customElements.get('nuxy-visually-hidden')) {
  customElements.define('nuxy-visually-hidden', NuxyVisuallyHiddenElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-visually-hidden': NuxyVisuallyHiddenElement
  }
}
