import './index.css'
import { syncHostClasses } from '../../h.ts'

const CLOSE_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`

export class NuxyBannerElement extends HTMLElement {
  private contentEl: HTMLDivElement | null = null
  private closeBtn: HTMLButtonElement | null = null

  static get observedAttributes(): string[] {
    return ['variant', 'dismissible']
  }

  connectedCallback(): void {
    this.build()
    this.reparentContent()
    this.sync()
    this.closeBtn?.addEventListener('click', this.onClose)
  }

  disconnectedCallback(): void {
    this.closeBtn?.removeEventListener('click', this.onClose)
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private onClose = (): void => {
    this.dispatchEvent(new CustomEvent('nuxy-banner-close', { bubbles: true, composed: true }))
  }

  private build(): void {
    if (this.contentEl) return

    this.contentEl = document.createElement('div')
    this.contentEl.className = 'nuxy-banner__content'

    this.closeBtn = document.createElement('button')
    this.closeBtn.type = 'button'
    this.closeBtn.className = 'nuxy-banner__close'
    this.closeBtn.setAttribute('aria-label', 'Dismiss banner')
    this.closeBtn.innerHTML = CLOSE_SVG

    this.append(this.contentEl, this.closeBtn)
  }

  private reparentContent(): void {
    if (!this.contentEl) return
    const nodes: Node[] = []
    for (const child of this.childNodes) {
      if (child === this.contentEl || child === this.closeBtn) continue
      nodes.push(child)
    }
    if (nodes.length) this.contentEl.replaceChildren(...nodes)
  }

  private sync(): void {
    const variant = this.getAttribute('variant') ?? 'info'
    const extraClass = this.getAttribute('class') ?? ''
    const dismissible = this.hasAttribute('dismissible')

    syncHostClasses(this, 'nuxy-banner', `nuxy-banner--${variant}`)
    this.setAttribute('role', 'status')

    if (this.closeBtn) {
      this.closeBtn.hidden = !dismissible
      this.closeBtn.style.display = dismissible ? '' : 'none'
    }
  }
}

if (!customElements.get('nuxy-banner')) {
  customElements.define('nuxy-banner', NuxyBannerElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-banner': NuxyBannerElement
  }
}
