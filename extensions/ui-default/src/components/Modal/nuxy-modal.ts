import './index.css'
import '../Text/nuxy-portal.ts'
import '../Icon/nuxy-icon.ts'
import {
  LitElement,
  html,
  nothing,
  customElement,
  property,
  ref,
  type PropertyValues,
} from '@nuxyorg/core'
import { bindDialogKeyHandlers } from '../../utils/focus-trap.ts'

@customElement('nuxy-modal')
export class NuxyModalElement extends LitElement {
  @property({ type: Boolean, reflect: true })
  declare open: boolean

  @property({ type: String })
  declare size: string

  @property({ type: String })
  declare title: string

  private dialogEl: HTMLDivElement | null = null
  private unbindKeys: (() => void) | null = null
  private prevBodyOverflow = ''

  protected createRenderRoot(): HTMLElement {
    return this
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.teardownOpenState()
  }

  updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('open')) {
      if (this.open) this.setupOpenState()
      else this.teardownOpenState()
    }
  }

  private onDialogRef = (el: Element | undefined): void => {
    this.dialogEl = (el as HTMLDivElement | null | undefined) ?? null
    if (this.open && this.dialogEl) {
      this.attachKeyHandlers()
      this.dialogEl.focus()
    }
  }

  private setupOpenState(): void {
    this.lockBodyScroll()
    this.attachKeyHandlers()
    this.dialogEl?.focus()
  }

  private teardownOpenState(): void {
    this.unlockBodyScroll()
    this.unbindKeys?.()
    this.unbindKeys = null
  }

  private attachKeyHandlers(): void {
    if (!this.open || !this.dialogEl || this.unbindKeys) return
    this.unbindKeys = bindDialogKeyHandlers(this.dialogEl, this.requestClose)
  }

  private lockBodyScroll(): void {
    this.prevBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }

  private unlockBodyScroll(): void {
    document.body.style.overflow = this.prevBodyOverflow
  }

  private requestClose = (): void => {
    this.dispatchEvent(new CustomEvent('nuxy-modal-close', { bubbles: true, composed: true }))
  }

  private onBackdropClick = (): void => {
    this.requestClose()
  }

  private stopPropagation = (e: Event): void => {
    e.stopPropagation()
  }

  render() {
    if (!this.open) return nothing

    const size = this.getAttribute('size') ?? this.size ?? 'md'
    const extraClass = this.getAttribute('class') ?? ''
    const titleAttr = this.getAttribute('title') ?? this.title ?? ''

    return html`
      <nuxy-portal>
        <div class="nuxy-modal-backdrop" role="presentation" @click=${this.onBackdropClick}>
          <div
            class=${['nuxy-modal', `nuxy-modal--${size}`, extraClass].filter(Boolean).join(' ')}
            role="dialog"
            aria-modal="true"
            aria-labelledby="nuxy-modal-title"
            tabindex="-1"
            ${ref(this.onDialogRef)}
            @click=${this.stopPropagation}
          >
            <div class="nuxy-modal__header">
              <h2 id="nuxy-modal-title" class="nuxy-modal__title">
                ${titleAttr || html`<slot name="title">Dialog</slot>`}
              </h2>
              <button
                type="button"
                class="nuxy-modal__close"
                aria-label="Close dialog"
                @click=${this.requestClose}
              >
                <nuxy-icon name="Close" size="16" opacity="1"></nuxy-icon>
              </button>
            </div>
            <div class="nuxy-modal__body"><slot></slot></div>
            <div class="nuxy-modal__footer"><slot name="footer"></slot></div>
          </div>
        </div>
      </nuxy-portal>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-modal': NuxyModalElement
  }
}
