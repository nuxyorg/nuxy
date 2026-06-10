import { LitElement, html, css, nothing, customElement, property, state } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'

function parseNum(attr: string | null, fallback?: number): number | undefined {
  if (attr === null || attr === '') return fallback
  const n = Number(attr)
  return Number.isFinite(n) ? n : fallback
}

@customElement('nuxy-number-input')
export class NuxyNumberInputElement extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--syntax-comment);
      border-radius: var(--radius-md);
      overflow: hidden;
      background: transparent;
      transition: border-color 0.15s ease;
    }

    :host(:focus-within) {
      border-color: var(--syntax-operator);
    }

    .nuxy-number-input__btn {
      width: 28px;
      height: 28px;
      background: transparent;
      border: none;
      color: var(--syntax-variable);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-lg);
      opacity: 0.6;
      transition:
        opacity 0.15s ease,
        background 0.15s ease;
      flex-shrink: 0;
      outline: none;
    }

    .nuxy-number-input__btn:hover:not(:disabled) {
      opacity: 1;
      background: rgba(255, 255, 255, 0.05);
    }

    .nuxy-number-input__btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .nuxy-number-input__field {
      width: 60px;
      text-align: center;
      background: transparent;
      border: none;
      color: var(--syntax-variable);
      font-size: var(--font-md);
      font-family: inherit;
      outline: none;
      padding: var(--space-1) 0;
      -moz-appearance: textfield;
    }

    .nuxy-number-input__field::-webkit-outer-spin-button,
    .nuxy-number-input__field::-webkit-inner-spin-button {
      -webkit-appearance: none;
    }
  `

  @property({ type: Number })
  declare min: number | undefined
  @property({ type: Number })
  declare max: number | undefined
  @property({ type: Number })
  declare step: number
  @property({ type: Boolean })
  declare disabled: boolean
  @property({ type: String })
  declare id: string

  @state()
  declare private currentValue: number | null

  private getStep(): number {
    return parseNum(this.getAttribute('step'), 1) ?? 1
  }

  private getCurrent(): number {
    if (this.currentValue !== null) return this.currentValue
    if (this.hasAttribute('value')) {
      return parseNum(this.getAttribute('value'), 0) ?? 0
    }
    return parseNum(this.getAttribute('default-value'), 0) ?? 0
  }

  private clamp(value: number): number {
    const min = this.min
    const max = this.max
    if (min !== undefined && value < min) declare
    value: unknown
    if (max !== undefined && value > max) value = max
    return value
  }

  private adjust(delta: number): void {
    if (this.disabled) return
    this.setValue(this.clamp(this.getCurrent() + delta))
  }

  private commitFromField(e: Event): void {
    if (this.disabled) return
    const input = e.target as HTMLInputElement
    this.setValue(this.clamp(Number(input.value)))
  }

  private setValue(next: number): void {
    this.currentValue = next
    this.setAttribute('value', String(next))
    this.dispatchEvent(
      new CustomEvent('nuxy-number-input-change', { detail: { value: next }, bubbles: true })
    )
  }

  render(): TemplateResult {
    const current = this.getCurrent()
    const min = this.min
    const max = this.max
    const step = this.getStep()
    const disabled = this.disabled
    const inputId = this.id || undefined

    const decDisabled = disabled || (min !== undefined && current <= min)
    const incDisabled = disabled || (max !== undefined && current >= max)

    return html`
      <button
        type="button"
        class="nuxy-number-input__btn"
        aria-label="Decrease"
        ?disabled=${decDisabled}
        @click=${() => this.adjust(-step)}
      >
        −
      </button>
      <input
        type="number"
        class="nuxy-number-input__field"
        .value=${String(current)}
        min=${min !== undefined ? min : nothing}
        max=${max !== undefined ? max : nothing}
        step=${step}
        ?disabled=${disabled}
        id=${inputId ?? nothing}
        @change=${this.commitFromField}
      />
      <button
        type="button"
        class="nuxy-number-input__btn"
        aria-label="Increase"
        ?disabled=${incDisabled}
        @click=${() => this.adjust(step)}
      >
        +
      </button>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-number-input': NuxyNumberInputElement
  }
}
