import './index.css'
import { syncHostClasses } from '../../h.ts'

function parseNum(attr: string | null, fallback?: number): number | undefined {
  if (attr === null || attr === '') return fallback
  const n = Number(attr)
  return Number.isFinite(n) ? n : fallback
}

export class NuxySliderElement extends HTMLElement {
  private valueEl: HTMLSpanElement | null = null
  private input: HTMLInputElement | null = null
  private labelsEl: HTMLDivElement | null = null

  static get observedAttributes(): string[] {
    return ['value', 'default-value', 'min', 'max', 'step', 'disabled', 'show-value', 'show-labels', 'id']
  }

  connectedCallback(): void {
    this.build()
    this.sync()
    this.input?.addEventListener('input', this.onInput)
  }

  disconnectedCallback(): void {
    this.input?.removeEventListener('input', this.onInput)
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private onInput = (): void => {
    if (this.hasAttribute('disabled') || !this.input) return
    const next = this.clamp(Number(this.input.value))
    this.setAttribute('value', String(next))
    this.sync()
    this.dispatchEvent(
      new CustomEvent('nuxy-slider-change', { detail: { value: next }, bubbles: true })
    )
  }

  private build(): void {
    if (this.input) return

    this.valueEl = document.createElement('span')
    this.valueEl.className = 'nuxy-slider__value'

    const trackWrapper = document.createElement('div')
    trackWrapper.className = 'nuxy-slider__track-wrapper'

    this.input = document.createElement('input')
    this.input.type = 'range'
    this.input.className = 'nuxy-slider__input'

    trackWrapper.appendChild(this.input)

    this.labelsEl = document.createElement('div')
    this.labelsEl.className = 'nuxy-slider__labels'

    this.append(this.valueEl, trackWrapper, this.labelsEl)
  }

  private getCurrent(): number {
    if (this.hasAttribute('value')) {
      return parseNum(this.getAttribute('value'), 0) ?? 0
    }
    return parseNum(this.getAttribute('default-value'), 0) ?? 0
  }

  private clamp(value: number): number {
    const min = parseNum(this.getAttribute('min'), 0) ?? 0
    const max = parseNum(this.getAttribute('max'), 100) ?? 100
    if (value < min) value = min
    if (value > max) value = max
    return value
  }

  private sync(): void {
    const extraClass = this.getAttribute('class') ?? ''
    const disabled = this.hasAttribute('disabled')
    const showValue = this.hasAttribute('show-value')
    const showLabels = this.hasAttribute('show-labels')
    const min = parseNum(this.getAttribute('min'), 0) ?? 0
    const max = parseNum(this.getAttribute('max'), 100) ?? 100
    const step = parseNum(this.getAttribute('step'), 1) ?? 1
    const current = this.getCurrent()
    const id = this.getAttribute('id')

    syncHostClasses(this, 'nuxy-slider', disabled ? 'nuxy-slider--disabled' : '')

    if (this.valueEl) {
      this.valueEl.hidden = !showValue
      this.valueEl.textContent = String(current)
    }

    if (this.input) {
      this.input.min = String(min)
      this.input.max = String(max)
      this.input.step = String(step)
      this.input.value = String(current)
      this.input.disabled = disabled
      this.input.setAttribute('aria-valuemin', String(min))
      this.input.setAttribute('aria-valuemax', String(max))
      this.input.setAttribute('aria-valuenow', String(current))
      if (id) this.input.id = id
      else this.input.removeAttribute('id')
    }

    if (this.labelsEl) {
      this.labelsEl.hidden = !showLabels
      if (showLabels) {
        this.labelsEl.replaceChildren(
          Object.assign(document.createElement('span'), { textContent: String(min) }),
          Object.assign(document.createElement('span'), { textContent: String(max) })
        )
      }
    }
  }
}

if (!customElements.get('nuxy-slider')) {
  customElements.define('nuxy-slider', NuxySliderElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-slider': NuxySliderElement
  }
}
