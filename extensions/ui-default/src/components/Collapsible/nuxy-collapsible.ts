import './index.css'
import { syncHostClasses } from '../../h.ts'

const CHEVRON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`

export class NuxyCollapsibleElement extends HTMLElement {
  private triggerBtn: HTMLButtonElement | null = null
  private triggerSlot: HTMLSpanElement | null = null
  private contentEl: HTMLDivElement | null = null

  static get observedAttributes(): string[] {
    return ['open', 'default-open']
  }

  connectedCallback(): void {
    this.build()
    this.reparentChildren()
    this.syncOpenState()
    this.triggerBtn?.addEventListener('click', this.onToggle)
  }

  disconnectedCallback(): void {
    this.triggerBtn?.removeEventListener('click', this.onToggle)
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return
    if (name === 'open' || name === 'default-open') this.syncOpenState()
    else if (name === 'class') this.syncClasses()
  }

  private onToggle = (): void => {
    const next = !this.isOpen()
    if (next) this.setAttribute('open', '')
    else this.removeAttribute('open')
    this.syncOpenState()
    this.dispatchEvent(
      new CustomEvent('nuxy-collapsible-change', {
        detail: { open: next },
        bubbles: true,
        composed: true,
      })
    )
  }

  private isOpen(): boolean {
    return this.hasAttribute('open')
  }

  private reparentChildren(): void {
    const triggerSource = this.querySelector('[data-trigger]')
    const contentSource = this.querySelector('[data-content]')

    if (triggerSource && this.triggerSlot && triggerSource.parentElement !== this.triggerSlot) {
      this.triggerSlot.appendChild(triggerSource)
    }

    if (contentSource && this.contentEl && contentSource.parentElement !== this.contentEl) {
      this.contentEl.appendChild(contentSource)
    }
  }

  private build(): void {
    if (this.triggerBtn) return

    this.triggerBtn = document.createElement('button')
    this.triggerBtn.type = 'button'
    this.triggerBtn.className = 'nuxy-collapsible__trigger'

    this.triggerSlot = document.createElement('span')
    this.triggerBtn.appendChild(this.triggerSlot)

    const chevron = document.createElement('span')
    chevron.className = 'nuxy-collapsible__chevron'
    chevron.setAttribute('aria-hidden', 'true')
    chevron.innerHTML = CHEVRON_SVG
    this.triggerBtn.appendChild(chevron)

    this.contentEl = document.createElement('div')
    this.contentEl.className = 'nuxy-collapsible__content'

    this.append(this.triggerBtn, this.contentEl)
  }

  private syncClasses(): void {
    syncHostClasses(this, 'nuxy-collapsible', this.isOpen() ? 'nuxy-collapsible--open' : '')
  }

  private syncOpenState(): void {
    if (!this.hasAttribute('open') && this.hasAttribute('default-open')) {
      this.setAttribute('open', '')
    }

    this.syncClasses()

    if (this.triggerBtn) {
      this.triggerBtn.setAttribute('aria-expanded', String(this.isOpen()))
    }
    if (this.contentEl) {
      this.contentEl.setAttribute('aria-hidden', String(!this.isOpen()))
    }
  }
}

if (!customElements.get('nuxy-collapsible')) {
  customElements.define('nuxy-collapsible', NuxyCollapsibleElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-collapsible': NuxyCollapsibleElement
  }
}
