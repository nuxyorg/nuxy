import { LitElement, nothing, customElement, property } from '@nuxy/core'

@customElement('nuxy-portal')
export class NuxyPortalElement extends LitElement {
  @property({ type: String }) container = ''

  private mountNode: HTMLElement | null = null
  private movedNodes: Node[] = []

  protected createRenderRoot(): HTMLElement {
    return this
  }

  connectedCallback(): void {
    this.style.display = 'contents'
    this.mount()
    super.connectedCallback()
  }

  disconnectedCallback(): void {
    this.restore()
    this.mountNode = null
    super.disconnectedCallback()
  }

  updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has('container')) {
      this.restore()
      this.mount()
    }
  }

  private resolveContainer(): HTMLElement {
    const id = this.container || this.getAttribute('container')
    if (id) {
      const el = document.getElementById(id)
      if (el) return el
    }
    return document.body
  }

  private mount(): void {
    this.mountNode = this.resolveContainer()
    // Skip comment nodes (Lit's render markers)
    this.movedNodes = Array.from(this.childNodes).filter((n) => n.nodeType !== Node.COMMENT_NODE)
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

  render() {
    return nothing
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-portal': NuxyPortalElement
  }
}
