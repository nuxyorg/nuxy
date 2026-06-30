import { LitElement, html, css, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { logCaughtError } from '@nuxyorg/core'

export interface CompareMeta {
  left?: { text: string; badge: string }
  right?: { text: string; badge: string }
}

@customElement('nuxy-compare-card')
export class NuxyCompareCardElement extends LitElement {
  static styles = css`
    :host {
      position: relative;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--radius-md);
      display: flex;
      align-items: stretch;
      min-height: 70px;
      overflow: hidden;
      transition:
        background 0.2s cubic-bezier(0.4, 0, 0.2, 1),
        border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
    }

    :host(:hover) {
      border-color: rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.04);
    }

    .nuxy-compare-panel {
      flex: 1;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .nuxy-compare-panel--left {
      background: rgba(255, 255, 255, 0.01);
      border-right: 1px dashed rgba(255, 255, 255, 0.06);
    }

    .nuxy-compare-panel__text {
      font-size: var(--font-lg);
      font-weight: 500;
      color: var(--syntax-variable);
      word-break: break-word;
    }

    .nuxy-compare-panel__text--highlight {
      color: var(--syntax-function);
    }

    .nuxy-compare-panel__badge {
      font-size: 11px;
      color: var(--syntax-comment);
      margin-top: 4px;
    }

    .nuxy-compare-arrow {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--syntax-comment);
      font-size: 18px;
      padding: 0 12px;
      user-select: none;
    }

    .nuxy-compare-card__copied {
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

    .nuxy-compare-card__copied--show {
      opacity: 0.95;
    }

    @media (prefers-reduced-motion: reduce) {
      :host {
        transition: none;
      }
    }
  `

  @property({ attribute: 'item-id' })
  declare itemId: string
  @property()
  declare value: string
  @property({ attribute: false })
  declare meta: CompareMeta | null
  @property({ type: Boolean })
  declare copied: boolean

  connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('click', this.onClick)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('click', this.onClick)
  }

  updated(): void {
    const visible = Boolean(this.meta?.left && this.meta?.right)
    this.hidden = !visible
  }

  private onClick = (): void => {
    const { value, itemId } = this
    if (!value || !itemId) return
    navigator.clipboard
      .writeText(value)
      .catch((err) => logCaughtError('nuxy-compare-card', err, 'clipboard.writeText'))
    this.dispatchEvent(
      new CustomEvent('nuxy-result-card-copy', {
        detail: { id: itemId },
        bubbles: true,
        composed: true,
      })
    )
  }

  render(): TemplateResult | typeof nothing {
    const meta = this.meta
    if (!meta?.left || !meta?.right) return nothing

    return html`
      <div class="nuxy-compare-panel nuxy-compare-panel--left">
        <div class="nuxy-compare-panel__text">${meta.left.text}</div>
        <div class="nuxy-compare-panel__badge">${meta.left.badge}</div>
      </div>
      <div class="nuxy-compare-arrow">→</div>
      <div class="nuxy-compare-panel">
        <div class="nuxy-compare-panel__text nuxy-compare-panel__text--highlight">
          ${meta.right.text}
        </div>
        <div class="nuxy-compare-panel__badge">${meta.right.badge}</div>
      </div>
      <div
        class="nuxy-compare-card__copied ${this.copied ? 'nuxy-compare-card__copied--show' : ''}"
      >
        Copied!
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-compare-card': NuxyCompareCardElement
  }
}
