import '../Text/index.css'

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export class NuxyHeadingElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['level', 'as']
  }

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render()
  }

  private render(): void {
    const levelRaw = this.getAttribute('as') ?? this.getAttribute('level') ?? '2'
    const level = Math.min(6, Math.max(1, Number(levelRaw.replace('h', '')) || 2)) as HeadingLevel
    const className = `nuxy-heading nuxy-heading--${level} ${this.getAttribute('class') ?? ''}`.trim()

    const heading = document.createElement(`h${level}`)
    heading.className = className
    while (this.firstChild) {
      heading.appendChild(this.firstChild)
    }
    this.replaceChildren(heading)
  }
}

if (!customElements.get('nuxy-heading')) {
  customElements.define('nuxy-heading', NuxyHeadingElement)
}

export type { HeadingLevel }
