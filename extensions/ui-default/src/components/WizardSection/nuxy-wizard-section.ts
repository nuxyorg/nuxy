import './index.css'
import { syncHostClasses } from '../../h.ts'

export class NuxyWizardSectionElement extends HTMLElement {
  private iconSlot: HTMLSpanElement | null = null
  private titleEl: HTMLHeadingElement | null = null
  private observer: MutationObserver | null = null

  static get observedAttributes(): string[] {
    return ['title']
  }

  connectedCallback(): void {
    this.build()
    this.sync()
    this.reparentChildren()
    this.observer = new MutationObserver(() => this.reparentChildren())
    this.observer.observe(this, { childList: true })
  }

  disconnectedCallback(): void {
    this.observer?.disconnect()
    this.observer = null
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private build(): void {
    if (this.iconSlot) return

    this.className = 'nuxy-wizard-section'

    this.iconSlot = document.createElement('span')
    this.iconSlot.className = 'nuxy-wizard-section__icon'

    this.titleEl = document.createElement('h2')
    this.titleEl.className = 'nuxy-wizard-section__title'

    this.append(this.iconSlot, this.titleEl)
  }

  private reparentChildren(): void {
    if (!this.iconSlot || !this.titleEl) return
    for (const child of Array.from(this.childNodes)) {
      if (child !== this.iconSlot && child !== this.titleEl) {
        this.iconSlot.appendChild(child)
      }
    }
  }

  private sync(): void {
    syncHostClasses(this, 'nuxy-wizard-section')

    if (this.titleEl) {
      this.titleEl.textContent = this.getAttribute('title') ?? ''
    }

    if (this.iconSlot) {
      this.iconSlot.hidden = this.iconSlot.childNodes.length === 0
    }
  }
}

if (!customElements.get('nuxy-wizard-section')) {
  customElements.define('nuxy-wizard-section', NuxyWizardSectionElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-wizard-section': NuxyWizardSectionElement
  }
}
