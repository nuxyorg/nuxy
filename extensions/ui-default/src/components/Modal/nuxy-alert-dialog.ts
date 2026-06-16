import '../Modal/index.css'
import './nuxy-modal.ts'
import { LitElement, customElement } from '@nuxyorg/core'

@customElement('nuxy-alert-dialog')
export class NuxyAlertDialogElement extends LitElement {
  private modal: HTMLElement | null = null

  static get observedAttributes(): string[] {
    return ['open', 'title', 'variant', 'confirm-label', 'cancel-label', 'class']
  }

  // Lit render() returns null — all DOM is managed imperatively
  render() {
    return null
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.build()
    this.reparentBody()
    this.sync()
    this.modal?.addEventListener('nuxy-modal-close', this.onModalClose)
    this.modal?.querySelector('[data-alert-cancel]')?.addEventListener('click', this.onCancel)
    this.modal?.querySelector('[data-alert-confirm]')?.addEventListener('click', this.onConfirm)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.modal?.removeEventListener('nuxy-modal-close', this.onModalClose)
    this.modal?.querySelector('[data-alert-cancel]')?.removeEventListener('click', this.onCancel)
    this.modal?.querySelector('[data-alert-confirm]')?.removeEventListener('click', this.onConfirm)
    this.modal?.remove()
    this.modal = null
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    super.attributeChangedCallback(name, oldVal, newVal)
    if (!this.isConnected) return
    if (name === 'open') this.syncOpen()
    else if (
      name === 'title' ||
      name === 'variant' ||
      name === 'confirm-label' ||
      name === 'cancel-label' ||
      name === 'class'
    ) {
      this.syncContent()
    }
  }

  private onModalClose = (): void => {
    this.dispatchEvent(
      new CustomEvent('nuxy-alert-dialog-close', { bubbles: true, composed: true })
    )
  }

  private onCancel = (): void => {
    if (this.modal) this.modal.removeAttribute('open')
    this.onModalClose()
  }

  private onConfirm = (): void => {
    if (this.modal) this.modal.removeAttribute('open')
    this.dispatchEvent(
      new CustomEvent('nuxy-alert-dialog-confirm', { bubbles: true, composed: true })
    )
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
    document.body.appendChild(this.modal)
  }

  private reparentBody(): void {
    const bodySlot = this.modal?.querySelector('[data-body]')
    if (!bodySlot) return
    const nodes: Node[] = []
    for (const child of this.childNodes) {
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
    this.modal.className = ['nuxy-alert-dialog', `nuxy-alert-dialog--${variant}`, extraClass]
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

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-alert-dialog': NuxyAlertDialogElement
  }
}
