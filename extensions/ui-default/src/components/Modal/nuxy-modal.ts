import './index.css'
import { LitElement, customElement } from '@nuxyorg/core'

@customElement('nuxy-modal')
export class NuxyModalElement extends LitElement {
  private backdrop: HTMLDivElement | null = null
  private dialog: HTMLDivElement | null = null
  private titleEl: HTMLHeadingElement | null = null
  private bodyEl: HTMLDivElement | null = null
  private footerEl: HTMLDivElement | null = null
  private escHandler: ((e: KeyboardEvent) => void) | null = null
  private prevBodyOverflow = ''
  private observer: MutationObserver | null = null

  static get observedAttributes(): string[] {
    return ['open', 'size', 'title', 'class']
  }

  // Lit render() returns null — all DOM is managed imperatively via syncOpenState
  render() {
    return null
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.syncOpenState()
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.stopObserving()
    this.unlockBodyScroll()
    this.removeEscListener()
    this.clearModal()
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    super.attributeChangedCallback(name, oldVal, newVal)
    if (!this.isConnected) return
    if (name === 'open') this.syncOpenState()
    else if (this.isOpen()) this.syncModalContent()
  }

  private isOpen(): boolean {
    return this.hasAttribute('open')
  }

  private syncOpenState(): void {
    if (this.isOpen()) {
      this.buildModal()
      this.reparentSlots()
      this.syncModalContent()
      this.lockBodyScroll()
      this.addEscListener()
      this.startObserving()
    } else {
      this.stopObserving()
      this.removeEscListener()
      this.unlockBodyScroll()
      this.clearModal()
    }
  }

  private buildModal(): void {
    if (this.backdrop) return

    this.backdrop = document.createElement('div')
    this.backdrop.className = 'nuxy-modal-backdrop'
    this.backdrop.setAttribute('role', 'presentation')
    this.backdrop.addEventListener('click', this.onBackdropClick)

    this.dialog = document.createElement('div')
    this.dialog.className = 'nuxy-modal'
    this.dialog.setAttribute('role', 'dialog')
    this.dialog.setAttribute('aria-modal', 'true')
    this.dialog.tabIndex = -1
    this.dialog.addEventListener('click', (e) => e.stopPropagation())

    const header = document.createElement('div')
    header.className = 'nuxy-modal__header'

    this.titleEl = document.createElement('h2')
    this.titleEl.id = 'nuxy-modal-title'
    this.titleEl.className = 'nuxy-modal__title'

    const closeBtn = document.createElement('button')
    closeBtn.type = 'button'
    closeBtn.className = 'nuxy-modal__close'
    closeBtn.setAttribute('aria-label', 'Close dialog')
    const closeIcon = document.createElement('nuxy-icon')
    closeIcon.setAttribute('name', 'Close')
    closeIcon.setAttribute('size', '16')
    closeIcon.setAttribute('opacity', '1')
    closeBtn.appendChild(closeIcon)
    closeBtn.addEventListener('click', this.requestClose)

    header.append(this.titleEl, closeBtn)

    this.bodyEl = document.createElement('div')
    this.bodyEl.className = 'nuxy-modal__body'

    this.footerEl = document.createElement('div')
    this.footerEl.className = 'nuxy-modal__footer'

    this.dialog.append(header, this.bodyEl, this.footerEl)
    this.backdrop.appendChild(this.dialog)
    document.body.appendChild(this.backdrop)
  }

  private clearModal(): void {
    this.backdrop?.removeEventListener('click', this.onBackdropClick)
    this.backdrop?.remove()
    this.backdrop = null
    this.dialog = null
    this.titleEl = null
    this.bodyEl = null
    this.footerEl = null
  }

  private reparentSlots(): void {
    const titleSource = this.querySelector('[data-title]')
    const bodySource = this.querySelector('[data-body]')
    const footerSource = this.querySelector('[data-footer]')

    if (titleSource && this.titleEl && titleSource.parentElement !== this.titleEl) {
      this.titleEl.replaceChildren(...titleSource.childNodes)
    }

    if (bodySource && this.bodyEl && bodySource.parentElement !== this.bodyEl) {
      this.bodyEl.replaceChildren(...bodySource.childNodes)
    }

    if (footerSource && this.footerEl) {
      if (footerSource.parentElement !== this.footerEl) {
        this.footerEl.replaceChildren(...footerSource.childNodes)
      }
      this.footerEl.hidden = false
    } else if (this.footerEl) {
      this.footerEl.replaceChildren()
      this.footerEl.hidden = true
    }
  }

  private syncModalContent(): void {
    if (!this.dialog) return

    const size = this.getAttribute('size') ?? 'md'
    const extraClass = this.getAttribute('class') ?? ''
    this.dialog.className = ['nuxy-modal', `nuxy-modal--${size}`, extraClass]
      .filter(Boolean)
      .join(' ')

    const titleAttr = this.getAttribute('title')
    const titleSource = this.querySelector('[data-title]')

    if (this.titleEl) {
      if (titleAttr) {
        this.titleEl.textContent = titleAttr
      } else if (titleSource) {
        this.titleEl.replaceChildren(...titleSource.childNodes)
      } else {
        this.titleEl.textContent = 'Dialog'
      }
      this.dialog.setAttribute('aria-labelledby', 'nuxy-modal-title')
    }

    this.reparentSlots()
  }

  private onBackdropClick = (): void => {
    this.requestClose()
  }

  private requestClose = (): void => {
    this.dispatchEvent(new CustomEvent('nuxy-modal-close', { bubbles: true, composed: true }))
  }

  private addEscListener(): void {
    if (this.escHandler) return
    this.escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.requestClose()
    }
    window.addEventListener('keydown', this.escHandler)
  }

  private removeEscListener(): void {
    if (!this.escHandler) return
    window.removeEventListener('keydown', this.escHandler)
    this.escHandler = null
  }

  private lockBodyScroll(): void {
    this.prevBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }

  private unlockBodyScroll(): void {
    document.body.style.overflow = this.prevBodyOverflow
  }

  private startObserving(): void {
    if (this.observer) return
    this.observer = new MutationObserver(() => {
      if (this.isOpen()) this.reparentSlots()
    })
    this.observer.observe(this, { childList: true, subtree: true })
  }

  private stopObserving(): void {
    this.observer?.disconnect()
    this.observer = null
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-modal': NuxyModalElement
  }
}
