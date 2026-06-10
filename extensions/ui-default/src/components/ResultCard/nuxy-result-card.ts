import {
  LitElement,
  html,
  css,
  nothing,
  customElement,
  property,
  type TemplateResult,
} from '@nuxy/core'
import '../Tag/nuxy-tag.ts'

@customElement('nuxy-result-card')
export class NuxyResultCardElement extends LitElement {
  static styles = css`
    :host {
      position: relative;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--radius-md);
      padding: 12px 16px;
      cursor: pointer;
      transition:
        background 0.2s cubic-bezier(0.4, 0, 0.2, 1),
        border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
        transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      overflow: hidden;
    }

    :host(:hover) {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.12);
      transform: translateY(-1px);
    }

    .nuxy-result-card__value {
      font-size: var(--font-xl);
      font-weight: 500;
      color: var(--syntax-variable);
    }

    .nuxy-result-card__title {
      font-size: var(--font-sm);
      color: var(--syntax-comment);
      margin-top: 2px;
    }

    .nuxy-result-card__copied {
      position: absolute;
      inset: 0;
      background: var(--bg-base);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--syntax-function);
      font-weight: 600;
      font-size: var(--font-md);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
    }

    .nuxy-result-card__copied--show {
      opacity: 0.95;
    }

    @media (prefers-reduced-motion: reduce) {
      :host {
        transition: none;
      }
    }
  `

  @property({ attribute: 'item-id' }) itemId = ''
  @property() title = ''
  @property() value = ''
  @property({ attribute: 'provider-name' }) providerName = ''
  @property({ type: Boolean }) copied = false

  connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('click', this.onClick)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('click', this.onClick)
  }

  private onClick = (): void => {
    const { value, itemId } = this
    if (!value || !itemId) return
    navigator.clipboard.writeText(value).catch(() => {})
    this.dispatchEvent(
      new CustomEvent('nuxy-result-card-copy', {
        detail: { id: itemId },
        bubbles: true,
        composed: true,
      })
    )
  }

  render(): TemplateResult {
    return html`
      <div>
        <div class="nuxy-result-card__value">${this.value}</div>
        <div class="nuxy-result-card__title">${this.title}</div>
      </div>
      ${this.providerName
        ? html`<nuxy-tag variant="blue">${this.providerName}</nuxy-tag>`
        : nothing}
      <div class="nuxy-result-card__copied ${this.copied ? 'nuxy-result-card__copied--show' : ''}">
        Copied!
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-result-card': NuxyResultCardElement
  }
}
