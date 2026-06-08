import './index.css'
import { syncHostClasses } from '../../h.ts'

const ERROR_ICON = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`

export class NuxyErrorStateElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['title', 'message', 'retry-label']
  }

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render()
  }

  private onRetry = (): void => {
    this.dispatchEvent(
      new CustomEvent('nuxy-error-state-retry', { bubbles: true, composed: true })
    )
  }

  private render(): void {
    const title = this.getAttribute('title') ?? 'Something went wrong'
    const message = this.getAttribute('message') ?? ''
    const retryLabel = this.getAttribute('retry-label')
    const extraClass = this.getAttribute('class') ?? ''

    syncHostClasses(this, 'nuxy-error-state')
    this.setAttribute('role', 'alert')

    this.replaceChildren()

    const icon = document.createElement('span')
    icon.className = 'nuxy-error-state__icon'
    icon.setAttribute('aria-hidden', 'true')
    icon.innerHTML = ERROR_ICON

    const titleEl = document.createElement('h3')
    titleEl.className = 'nuxy-error-state__title'
    titleEl.textContent = title

    const messageEl = document.createElement('p')
    messageEl.className = 'nuxy-error-state__message'
    messageEl.textContent = message

    this.append(icon, titleEl, messageEl)

    if (retryLabel !== null) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'nuxy-button nuxy-button--default nuxy-error-state__retry'
      btn.textContent = retryLabel
      btn.addEventListener('click', this.onRetry)
      this.appendChild(btn)
    }
  }
}

if (!customElements.get('nuxy-error-state')) {
  customElements.define('nuxy-error-state', NuxyErrorStateElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-error-state': NuxyErrorStateElement
  }
}
