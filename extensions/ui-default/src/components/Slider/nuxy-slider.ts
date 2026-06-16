import { LitElement, html, css, nothing, customElement, property, state } from '@nuxyorg/core'
import type { TemplateResult } from '@nuxyorg/core'

function parseNum(attr: string | null, fallback?: number): number | undefined {
  if (attr === null || attr === '') return fallback
  const n = Number(attr)
  return Number.isFinite(n) ? n : fallback
}

@customElement('nuxy-slider')
export class NuxySliderElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      width: 100%;
    }

    .nuxy-slider__track-wrapper {
      position: relative;
      height: 20px;
      display: flex;
      align-items: center;
    }

    .nuxy-slider__input {
      width: 100%;
      height: 4px;
      -webkit-appearance: none;
      appearance: none;
      background: transparent;
      outline: none;
      cursor: pointer;
      position: relative;
      z-index: 1;
    }

    .nuxy-slider__input::-webkit-slider-runnable-track {
      height: 4px;
      border-radius: 2px;
      background: var(--syntax-comment);
    }

    .nuxy-slider__input::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--syntax-operator);
      cursor: pointer;
      margin-top: -6px;
      transition: transform 0.15s ease;
    }

    .nuxy-slider__input::-webkit-slider-thumb:hover {
      transform: scale(1.2);
    }

    .nuxy-slider__input::-moz-range-track {
      height: 4px;
      border-radius: 2px;
      background: var(--syntax-comment);
    }

    .nuxy-slider__input::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--syntax-operator);
      border: none;
      cursor: pointer;
    }

    .nuxy-slider__labels {
      display: flex;
      justify-content: space-between;
      font-size: var(--font-xs);
      color: var(--syntax-comment);
    }

    .nuxy-slider__value {
      font-size: var(--font-sm);
      color: var(--syntax-operator);
      font-variant-numeric: tabular-nums;
    }

    :host([disabled]) .nuxy-slider__input {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `

  @property({ type: Number })
  declare min: number
  @property({ type: Number })
  declare max: number
  @property({ type: Number })
  declare step: number
  @property({ type: Boolean, reflect: true })
  declare disabled: boolean
  @property({ attribute: 'show-value', type: Boolean })
  declare showValue: boolean
  @property({ attribute: 'show-labels', type: Boolean })
  declare showLabels: boolean
  @property({ type: String })
  declare id: string

  @state()
  declare private currentValue: number | null

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
    if (value < min) value = min
    if (value > max) value = max
    return value
  }

  private onInput(e: Event): void {
    if (this.disabled) return
    const input = e.target as HTMLInputElement
    const next = this.clamp(Number(input.value))
    this.currentValue = next
    this.setAttribute('value', String(next))
    this.dispatchEvent(
      new CustomEvent('nuxy-slider-change', { detail: { value: next }, bubbles: true })
    )
  }

  render(): TemplateResult {
    const min = this.min
    const max = this.max
    const step = this.step
    const disabled = this.disabled
    const showValue = this.showValue
    const showLabels = this.showLabels
    const current = this.getCurrent()
    const inputId = this.id || undefined

    return html`
      <span class="nuxy-slider__value" ?hidden=${!showValue}>${current}</span>
      <div class="nuxy-slider__track-wrapper">
        <input
          type="range"
          class="nuxy-slider__input"
          min=${min}
          max=${max}
          step=${step}
          .value=${String(current)}
          ?disabled=${disabled}
          aria-valuemin=${min}
          aria-valuemax=${max}
          aria-valuenow=${current}
          id=${inputId ?? nothing}
          @input=${this.onInput}
        />
      </div>
      <div class="nuxy-slider__labels" ?hidden=${!showLabels}>
        ${showLabels ? html`<span>${min}</span><span>${max}</span>` : nothing}
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-slider': NuxySliderElement
  }
}
