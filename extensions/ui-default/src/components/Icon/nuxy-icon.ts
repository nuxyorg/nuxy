import { ICON_PATHS } from './icon-paths'

const DEFAULT_SIZE = 18
const DEFAULT_OPACITY = 0.65

function resolveSize(raw: string | null): number | string {
  if (!raw) return DEFAULT_SIZE
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : raw
}

export class NuxyIconElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['name', 'size', 'opacity', 'color', 'class']
  }

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render()
  }

  private render(): void {
    const name = this.getAttribute('name')
    if (!name) {
      this.replaceChildren()
      return
    }

    const def = ICON_PATHS[name]
    if (!def) {
      this.replaceChildren()
      return
    }

    const size = resolveSize(this.getAttribute('size'))
    const opacityAttr = this.getAttribute('opacity')
    const opacity =
      opacityAttr != null
        ? Number(opacityAttr)
        : (def.defaultOpacity ?? DEFAULT_OPACITY)
    const color = this.getAttribute('color') ?? def.defaultColor ?? 'currentColor'
    const extraClass = this.getAttribute('class') ?? ''

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', String(size))
    svg.setAttribute('height', String(size))
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('fill', 'none')
    svg.setAttribute('stroke', 'currentColor')
    svg.setAttribute('stroke-width', '1.5')
    svg.setAttribute('stroke-linecap', 'round')
    svg.setAttribute('stroke-linejoin', 'round')
    if (extraClass) svg.setAttribute('class', extraClass)
    svg.style.opacity = String(opacity)
    if (color !== 'currentColor') svg.style.color = color
    svg.innerHTML = def.paths

    this.replaceChildren(svg)
  }
}

if (!customElements.get('nuxy-icon')) {
  customElements.define('nuxy-icon', NuxyIconElement)
}
