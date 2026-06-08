import { syncHostClasses } from '../ce-utils.ts'

interface CompareMeta {
  left?: { text: string; badge: string }
  right?: { text: string; badge: string }
}

function parseMeta(raw: string | null): CompareMeta | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as CompareMeta
  } catch {
    return null
  }
}

export class NuxyCompareCardElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['item-id', 'value', 'meta', 'copied']
  }

  connectedCallback(): void {
    syncHostClasses(this, 'nuxy-compare-card')
    this.render()
    this.addEventListener('click', this.onClick)
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.onClick)
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render()
  }

  private onClick = (): void => {
    const value = this.getAttribute('value')
    const id = this.getAttribute('item-id')
    if (!value || !id) return
    navigator.clipboard.writeText(value).catch(() => {})
    this.dispatchEvent(
      new CustomEvent('nuxy-result-card-copy', { detail: { id }, bubbles: true, composed: true })
    )
  }

  private render(): void {
    const meta = parseMeta(this.getAttribute('meta'))
    if (!meta?.left || !meta?.right) {
      this.replaceChildren()
      this.hidden = true
      return
    }

    this.hidden = false
    const copied = this.hasAttribute('copied')
    syncHostClasses(this, 'nuxy-compare-card')

    this.replaceChildren()

    const left = document.createElement('div')
    left.className = 'nuxy-compare-panel nuxy-compare-panel--left'
    left.innerHTML = `<div class="nuxy-compare-panel__text"></div><div class="nuxy-compare-panel__badge"></div>`
    left.querySelector('.nuxy-compare-panel__text')!.textContent = meta.left.text
    left.querySelector('.nuxy-compare-panel__badge')!.textContent = meta.left.badge

    const arrow = document.createElement('div')
    arrow.className = 'nuxy-compare-arrow'
    arrow.textContent = '→'

    const right = document.createElement('div')
    right.className = 'nuxy-compare-panel'
    right.innerHTML = `<div class="nuxy-compare-panel__text"></div><div class="nuxy-compare-panel__badge"></div>`
    const rightText = right.querySelector('.nuxy-compare-panel__text') as HTMLElement
    rightText.textContent = meta.right.text
    rightText.style.color = 'var(--syntax-function)'
    right.querySelector('.nuxy-compare-panel__badge')!.textContent = meta.right.badge

    const copiedEl = document.createElement('div')
    copiedEl.className = `nuxy-result-card__copied ${copied ? 'nuxy-result-card__copied--show' : ''}`
    copiedEl.textContent = 'Copied!'

    this.append(left, arrow, right, copiedEl)
  }
}

if (!customElements.get('nuxy-compare-card')) {
  customElements.define('nuxy-compare-card', NuxyCompareCardElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-compare-card': NuxyCompareCardElement
  }
}
