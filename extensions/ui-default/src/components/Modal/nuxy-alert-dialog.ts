import '../Modal/index.css'
import './nuxy-modal.ts'
import { LitElement, html, customElement, property } from '@nuxyorg/core'

@customElement('nuxy-alert-dialog')
export class NuxyAlertDialogElement extends LitElement {
  @property({ type: Boolean, reflect: true })
  declare open: boolean

  @property({ type: String })
  declare title: string

  @property({ type: String })
  declare variant: string

  @property({ type: String, attribute: 'confirm-label' })
  declare confirmLabel: string

  @property({ type: String, attribute: 'cancel-label' })
  declare cancelLabel: string

  protected createRenderRoot(): HTMLElement {
    return this
  }

  private onModalClose = (): void => {
    this.open = false
    this.dispatchEvent(
      new CustomEvent('nuxy-alert-dialog-close', { bubbles: true, composed: true })
    )
  }

  private onCancel = (): void => {
    this.onModalClose()
  }

  private onConfirm = (): void => {
    this.open = false
    this.dispatchEvent(
      new CustomEvent('nuxy-alert-dialog-confirm', { bubbles: true, composed: true })
    )
  }

  render() {
    const variant = this.variant || this.getAttribute('variant') || 'danger'
    const extraClass = this.getAttribute('class') ?? ''
    const modalClass = ['nuxy-alert-dialog', `nuxy-alert-dialog--${variant}`, extraClass]
      .filter(Boolean)
      .join(' ')
    const confirmClass =
      variant === 'danger'
        ? 'nuxy-button nuxy-button--destructive'
        : 'nuxy-button nuxy-button--primary'
    const cancelText = this.cancelLabel || this.getAttribute('cancel-label') || 'Cancel'
    const confirmText = this.confirmLabel || this.getAttribute('confirm-label') || 'Confirm'
    const title = this.title || this.getAttribute('title') || ''

    return html`
      <nuxy-modal
        ?open=${this.open}
        size="sm"
        class=${modalClass}
        title=${title}
        @nuxy-modal-close=${this.onModalClose}
      >
        <slot></slot>
        <div slot="footer">
          <button type="button" class="nuxy-button nuxy-button--default" @click=${this.onCancel}>
            ${cancelText}
          </button>
          <button type="button" class=${confirmClass} @click=${this.onConfirm}>
            ${confirmText}
          </button>
        </div>
      </nuxy-modal>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-alert-dialog': NuxyAlertDialogElement
  }
}
