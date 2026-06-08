import './index.css'

export class NuxyAccordionElement extends HTMLElement {
  connectedCallback(): void {
    this.classList.add('nuxy-accordion')
  }
}

if (!customElements.get('nuxy-accordion')) {
  customElements.define('nuxy-accordion', NuxyAccordionElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-accordion': NuxyAccordionElement
  }
}
