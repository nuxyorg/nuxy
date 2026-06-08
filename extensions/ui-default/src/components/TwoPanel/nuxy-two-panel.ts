import './index.css'
import { syncHostClasses } from '../../h.ts'

export class NuxyTwoPanelElement extends HTMLElement {
  private left: HTMLDivElement | null = null
  private right: HTMLDivElement | null = null

  static get observedAttributes(): string[] {
    return ['split']
  }

  connectedCallback(): void {
    const nodes: Node[] = []
    for (const child of Array.from(this.childNodes)) {
      nodes.push(child)
    }

    this.left = document.createElement('div')
    this.left.className = 'nuxy-two-panel__left'
    this.right = document.createElement('div')
    this.right.className = 'nuxy-two-panel__right'

    if (nodes[0]) this.left.appendChild(nodes[0])
    if (nodes[1]) this.right.appendChild(nodes[1])

    this.appendChild(this.left)
    this.appendChild(this.right)
    this.sync()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private sync(): void {
    const split = this.getAttribute('split') ?? '50%'
    const extraClass = this.getAttribute('class') ?? ''

    syncHostClasses(this, 'nuxy-two-panel')
    if (this.left) this.left.style.width = split
  }
}

if (!customElements.get('nuxy-two-panel')) {
  customElements.define('nuxy-two-panel', NuxyTwoPanelElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-two-panel': NuxyTwoPanelElement
  }
}
