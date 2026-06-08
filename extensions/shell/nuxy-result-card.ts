import { syncHostClasses } from '../ce-utils.ts'

export class NuxyResultCardElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['item-id', 'title', 'value', 'provider-name', 'copied']
  }

  connectedCallback(): void {
    syncHostClasses(this, 'nuxy-result-card')
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
    const title = this.getAttribute('title') ?? ''
    const value = this.getAttribute('value') ?? ''
    const providerName = this.getAttribute('provider-name') ?? ''
    const copied = this.hasAttribute('copied')
    syncHostClasses(this, 'nuxy-result-card')

    this.replaceChildren()

    const body = document.createElement('div')
    const valueEl = document.createElement('div')
    valueEl.className = 'nuxy-result-card__value'
    valueEl.textContent = value
    const titleEl = document.createElement('div')
    titleEl.className = 'nuxy-result-card__title'
    titleEl.textContent = title
    body.append(valueEl, titleEl)

    const badge = document.createElement('span')
    badge.style.cssText =
      'font-size:var(--font-xs,10px);font-weight:600;letter-spacing:0.5px;padding:2px 7px;border-radius:20px;background:var(--surface-accent-subtle);border:1px solid var(--border-accent);color:var(--color-accent)'
    badge.textContent = providerName

    const copiedEl = document.createElement('div')
    copiedEl.className = `nuxy-result-card__copied ${copied ? 'nuxy-result-card__copied--show' : ''}`
    copiedEl.textContent = 'Copied!'

    this.append(body, badge, copiedEl)
  }
}

if (!customElements.get('nuxy-result-card')) {
  customElements.define('nuxy-result-card', NuxyResultCardElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-result-card': NuxyResultCardElement
  }
}
