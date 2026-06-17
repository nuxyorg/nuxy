import { LitElement, html, css, nothing, customElement, property } from '@nuxyorg/core'
import type { TemplateResult } from '@nuxyorg/core'
import { parseNum } from '../../utils/parse.ts'

@customElement('nuxy-progress-bar')
export class NuxyProgressBarElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      width: 100%;
    }

    .nuxy-progress__header {
      display: flex;
      justify-content: space-between;
      font-size: var(--font-xs);
      color: var(--syntax-comment);
    }

    .nuxy-progress__track {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-xl);
      overflow: hidden;
    }

    .nuxy-progress__track--sm {
      height: 3px;
    }
    .nuxy-progress__track--md {
      height: 6px;
    }
    .nuxy-progress__track--lg {
      height: 10px;
    }

    .nuxy-progress__fill {
      height: 100%;
      border-radius: var(--radius-xl);
      background: var(--syntax-operator);
      transition: width 0.3s ease;
    }

    .nuxy-progress__fill--indeterminate {
      width: 40% !important;
      animation: nuxy-progress-indeterminate 1.4s ease infinite;
    }

    @keyframes nuxy-progress-indeterminate {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(350%);
      }
    }
  `

  @property({ type: Number })
  declare value: number | undefined
  @property({ type: Number })
  declare max: number
  @property({ type: String })
  declare size: string
  @property({ type: String })
  declare label: string
  @property({ attribute: 'show-value', type: Boolean })
  declare showValue: boolean

  connectedCallback(): void {
    super.connectedCallback()
    this.setAttribute('role', 'progressbar')
    this.setAttribute('aria-valuemin', '0')
    this.setAttribute('aria-valuemax', '100')
  }

  updated(): void {
    const indeterminate = !this.hasAttribute('value') && this.value === undefined
    const max = this.max
    const rawValue = this.value ?? 0
    const pct = indeterminate ? 0 : Math.min(100, Math.max(0, (rawValue / max) * 100))

    if (indeterminate) {
      this.removeAttribute('aria-valuenow')
    } else {
      this.setAttribute('aria-valuenow', String(Math.round(pct)))
    }
  }

  render(): TemplateResult {
    const indeterminate = !this.hasAttribute('value') && this.value === undefined
    const max = this.max
    const rawValue = this.value ?? parseNum(this.getAttribute('value'), 0) ?? 0
    const pct = indeterminate ? 0 : Math.min(100, Math.max(0, (rawValue / max) * 100))
    const size = this.size
    const label = this.label || this.getAttribute('label') || ''
    const showValue = this.showValue || this.hasAttribute('show-value')

    const showHeader = Boolean(label) || (showValue && !indeterminate)
    const fillClass = [
      'nuxy-progress__fill',
      indeterminate ? 'nuxy-progress__fill--indeterminate' : '',
    ]
      .filter(Boolean)
      .join(' ')

    return html`
      ${showHeader
        ? html`
            <div class="nuxy-progress__header">
              ${label ? html`<span>${label}</span>` : nothing}
              ${showValue && !indeterminate ? html`<span>${Math.round(pct)}%</span>` : nothing}
            </div>
          `
        : nothing}
      <div class=${`nuxy-progress__track nuxy-progress__track--${size}`}>
        <div class=${fillClass} style=${indeterminate ? '' : `width:${pct}%`}></div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-progress-bar': NuxyProgressBarElement
  }
}
