export class NuxyPortalElement extends HTMLElement {
  private mountNode: HTMLElement | null = null
  private movedNodes: Node[] = []

  static get observedAttributes(): string[] {
    return ['container']
  }

  connectedCallback(): void {
    this.style.display = 'contents'
    this.mount()
  }

  disconnectedCallback(): void {
    for (const node of this.movedNodes) {
      if (node.parentNode === this.mountNode) {
        this.appendChild(node)
      }
    }
    this.movedNodes = []
    this.mountNode = null
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.restore()
      this.mount()
    }
  }

  private resolveContainer(): HTMLElement {
    const id = this.getAttribute('container')
    if (id) {
      const el = document.getElementById(id)
      if (el) return el
    }
    return document.body
  }

  private mount(): void {
    this.mountNode = this.resolveContainer()
    this.movedNodes = Array.from(this.childNodes)
    for (const node of this.movedNodes) {
      this.mountNode.appendChild(node)
    }
  }

  private restore(): void {
    for (const node of this.movedNodes) {
      if (node.parentNode === this.mountNode) {
        this.appendChild(node)
      }
    }
    this.movedNodes = []
  }
}

if (!customElements.get('nuxy-portal')) {
  customElements.define('nuxy-portal', NuxyPortalElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-portal': NuxyPortalElement
  }
}
