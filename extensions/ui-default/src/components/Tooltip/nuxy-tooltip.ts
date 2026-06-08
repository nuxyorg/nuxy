import './index.css'

const PLACEMENTS = new Set(['top', 'bottom', 'left', 'right'])

export class NuxyTooltipElement extends HTMLElement {
  private wrapper: HTMLSpanElement | null = null
  private triggerSlot: HTMLSpanElement | null = null
  private tooltipEl: HTMLSpanElement | null = null

  static get observedAttributes(): string[] {
    return ['content', 'placement', 'class']
  }

  connectedCallback(): void {
    this.build()
    this.sync()
    this.wrapper?.addEventListener('mouseenter', this.show)
    this.wrapper?.addEventListener('mouseleave', this.hide)
    this.wrapper?.addEventListener('focusin', this.show)
    this.wrapper?.addEventListener('focusout', this.hide)
  }

  disconnectedCallback(): void {
    this.wrapper?.removeEventListener('mouseenter', this.show)
    this.wrapper?.removeEventListener('mouseleave', this.hide)
    this.wrapper?.removeEventListener('focusin', this.show)
    this.wrapper?.removeEventListener('focusout', this.hide)
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private show = (): void => {
    this.tooltipEl?.classList.add('nuxy-tooltip--visible')
  }

  private hide = (): void => {
    this.tooltipEl?.classList.remove('nuxy-tooltip--visible')
  }

  private build(): void {
    if (this.wrapper) return

    const nodes: Node[] = []
    for (const child of this.childNodes) nodes.push(child)

    this.wrapper = document.createElement('span')
    this.wrapper.className = 'nuxy-tooltip-wrapper'

    this.triggerSlot = document.createElement('span')
    for (const node of nodes) {
      this.triggerSlot.appendChild(node)
    }

    this.tooltipEl = document.createElement('span')
    this.tooltipEl.role = 'tooltip'

    this.wrapper.append(this.triggerSlot, this.tooltipEl)
    this.appendChild(this.wrapper)
  }

  private sync(): void {
    const content = this.getAttribute('content') ?? ''
    const placementRaw = this.getAttribute('placement') ?? 'top'
    const placement = PLACEMENTS.has(placementRaw) ? placementRaw : 'top'
    const extraClass = this.getAttribute('class') ?? ''

    if (this.wrapper) {
      this.wrapper.className = ['nuxy-tooltip-wrapper', extraClass].filter(Boolean).join(' ')
    }
    if (this.tooltipEl) {
      this.tooltipEl.className = `nuxy-tooltip nuxy-tooltip--${placement}`
      this.tooltipEl.textContent = content
    }
  }
}

if (!customElements.get('nuxy-tooltip')) {
  customElements.define('nuxy-tooltip', NuxyTooltipElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-tooltip': NuxyTooltipElement
  }
}
