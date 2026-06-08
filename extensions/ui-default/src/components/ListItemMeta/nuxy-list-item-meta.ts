import './index.css'
import { syncHostClasses } from '../../h.ts'

export class NuxyListItemMetaElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return []
  }

  connectedCallback(): void {
    this.classList.add('nuxy-list-item-meta')
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render()
  }

  private render(): void {
    const extraClass = this.getAttribute('class') ?? ''

    syncHostClasses(this, 'nuxy-list-item-meta')

    let text = this.querySelector('.nuxy-list-item-meta__text')
    const nodes: Node[] = []
    for (const child of this.childNodes) {
      if (child === text) continue
      nodes.push(child)
    }

    if (!text) {
      text = document.createElement('span')
      text.className = 'nuxy-list-item-meta__text'
      this.appendChild(text)
    }
    if (nodes.length) {
      text.replaceChildren(...nodes)
    }
  }
}

if (!customElements.get('nuxy-list-item-meta')) {
  customElements.define('nuxy-list-item-meta', NuxyListItemMetaElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-list-item-meta': NuxyListItemMetaElement
  }
}
