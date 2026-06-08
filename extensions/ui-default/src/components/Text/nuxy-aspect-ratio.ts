export class NuxyAspectRatioElement extends HTMLElement {
  private inner: HTMLDivElement | null = null

  static get observedAttributes(): string[] {
    return ['ratio', 'class']
  }

  connectedCallback(): void {
    this.build()
    this.reparentChildren()
    this.sync()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private build(): void {
    if (this.inner) return
    this.inner = document.createElement('div')
    this.appendChild(this.inner)
  }

  private reparentChildren(): void {
    if (!this.inner) return
    const nodes: Node[] = []
    for (const child of this.childNodes) {
      if (child === this.inner) continue
      nodes.push(child)
    }
    if (nodes.length) this.inner.replaceChildren(...nodes)
  }

  private sync(): void {
    const ratio = Number(this.getAttribute('ratio') ?? '1') || 1
    const extraClass = this.getAttribute('class') ?? ''

    this.style.position = 'relative'
    this.style.width = '100%'
    this.style.paddingBottom = `${100 / ratio}%`

    if (this.inner) {
      this.inner.style.position = 'absolute'
      this.inner.style.top = '0'
      this.inner.style.right = '0'
      this.inner.style.bottom = '0'
      this.inner.style.left = '0'
    }

    if (extraClass) this.className = extraClass
  }
}

if (!customElements.get('nuxy-aspect-ratio')) {
  customElements.define('nuxy-aspect-ratio', NuxyAspectRatioElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-aspect-ratio': NuxyAspectRatioElement
  }
}
