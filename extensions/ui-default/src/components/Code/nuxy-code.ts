import './index.css'

export class NuxyCodeElement extends HTMLElement {
  connectedCallback(): void {
    this.classList.add('nuxy-code')
  }
}

if (!customElements.get('nuxy-code')) {
  customElements.define('nuxy-code', NuxyCodeElement)
}
