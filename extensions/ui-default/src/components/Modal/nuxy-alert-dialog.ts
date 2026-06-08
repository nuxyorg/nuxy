import '../Modal/index.css'
import './nuxy-modal.ts'

export class NuxyAlertDialogElement extends HTMLElement {
  private modal: HTMLElement | null = null
  private confirmHandler: (() => void) | null = null
  private closeHandler: (() => void) | null = null

  static get observedAttributes(): string[] {
    return ['open', 'title', 'variant', 'confirm-label', 'cancel-label', 'class']
  }

  connectedCallback(): void {
    this.style.display = 'contents'
    this.build()
    this.reparentBody()
    this.sync()
    this.modal?.addEventListener('nuxy-modal-close', this.onModalClose)
    this.querySelector('[data-alert-cancel]')?.addEventListener('click', this.onCancel)
    this.querySelector('[data-alert-confirm]')?.addEventListener('click', this.onConfirm)
  }

  disconnectedCallback(): void {
    this.modal?.removeEventListener('nuxy-modal-close', this.onModalClose)
    this.querySelector('[data-alert-cancel]')?.removeEventListener('click', this.onCancel)
    this.querySelector('[data-alert-confirm]')?.removeEventListener('click', this.onConfirm)
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return
    if (name === 'open') this.syncOpen()
    else if (name === 'title' || name === 'variant' || name === 'confirm-label' || name === 'cancel-label' || name === 'class') {
      this.syncContent()
    }
  }

  private onModalClose = (): void => {
    this.dispatchEvent(new CustomEvent('nuxy-alert-dialog-close', { bubbles: true, composed: true }))
  }

  private onCancel = (): void => {
    if (this.modal) this.modal.removeAttribute('open')
    this.onModalClose()
  }

  private onConfirm = (): void => {
    if (this.modal) this.modal.removeAttribute('open')
    this.dispatchEvent(new CustomEvent('nuxy-alert-dialog-confirm', { bubbles: true, composed: true }))
  }

  private build(): void {
    if (this.modal) return

    this.modal = document.createElement('nuxy-modal')
    this.modal.setAttribute('size', 'sm')

    const bodySlot = document.createElement('div')
    bodySlot.setAttribute('data-body', '')

    const footer = document.createElement('div')
    footer.setAttribute('data-footer', '')

    const cancelBtn = document.createElement('button')
    cancelBtn.type = 'button'
    cancelBtn.className = 'nuxy-button nuxy-button--default'
    cancelBtn.setAttribute('data-alert-cancel', '')

    const confirmBtn = document.createElement('button')
    confirmBtn.type = 'button'
    confirmBtn.className = 'nuxy-button nuxy-button--destructive'
    confirmBtn.setAttribute('data-alert-confirm', '')

    footer.append(cancelBtn, confirmBtn)
    this.modal.append(bodySlot, footer)
    this.appendChild(this.modal)
  }

  private reparentBody(): void {
    const bodySlot = this.modal?.querySelector('[data-body]')
    if (!bodySlot) return
    const nodes: Node[] = []
    for (const child of this.childNodes) {
      if (child === this.modal) continue
      nodes.push(child)
    }
    if (nodes.length) bodySlot.replaceChildren(...nodes)
  }

  private syncOpen(): void {
    if (!this.modal) return
    if (this.hasAttribute('open')) this.modal.setAttribute('open', '')
    else this.modal.removeAttribute('open')
  }

  private syncContent(): void {
    if (!this.modal) return

    const variant = this.getAttribute('variant') ?? 'danger'
    const extraClass = this.getAttribute('class') ?? ''
    this.modal.className = [
      'nuxy-alert-dialog',
      `nuxy-alert-dialog--${variant}`,
      extraClass,
    ]
      .filter(Boolean)
      .join(' ')

    const title = this.getAttribute('title')
    if (title) this.modal.setAttribute('title', title)
    else this.modal.removeAttribute('title')

    const cancelBtn = this.modal.querySelector('[data-alert-cancel]') as HTMLButtonElement | null
    const confirmBtn = this.modal.querySelector('[data-alert-confirm]') as HTMLButtonElement | null

    if (cancelBtn) {
      cancelBtn.textContent = this.getAttribute('cancel-label') ?? 'Cancel'
    }
    if (confirmBtn) {
      confirmBtn.textContent = this.getAttribute('confirm-label') ?? 'Confirm'
      confirmBtn.className = `nuxy-button ${variant === 'danger' ? 'nuxy-button--destructive' : 'nuxy-button--primary'}`
    }

    this.syncOpen()
  }

  private sync(): void {
    this.syncContent()
    this.syncOpen()
  }
}

if (!customElements.get('nuxy-alert-dialog')) {
  customElements.define('nuxy-alert-dialog', NuxyAlertDialogElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-alert-dialog': NuxyAlertDialogElement
  }
}
