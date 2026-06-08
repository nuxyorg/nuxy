import './index.css'
import { syncHostClasses } from '../../h.ts'

function parseNum(attr: string | null, fallback?: number): number | undefined {
  if (attr === null || attr === '') return fallback
  const n = Number(attr)
  return Number.isFinite(n) ? n : fallback
}

export class NuxyNumberInputElement extends HTMLElement {
  private decBtn: HTMLButtonElement | null = null
  private field: HTMLInputElement | null = null
  private incBtn: HTMLButtonElement | null = null

  static get observedAttributes(): string[] {
    return ['value', 'default-value', 'min', 'max', 'step', 'disabled', 'id', 'class']
  }

  connectedCallback(): void {
    this.build()
    this.sync()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private build(): void {
    if (this.field) return

    this.decBtn = document.createElement('button')
    this.decBtn.type = 'button'
    this.decBtn.className = 'nuxy-number-input__btn'
    this.decBtn.setAttribute('aria-label', 'Decrease')
    this.decBtn.textContent = '−'
    this.decBtn.addEventListener('click', () => this.adjust(-this.getStep()))

    this.field = document.createElement('input')
    this.field.type = 'number'
    this.field.className = 'nuxy-number-input__field'
    this.field.addEventListener('change', () => this.commitFromField())

    this.incBtn = document.createElement('button')
    this.incBtn.type = 'button'
    this.incBtn.className = 'nuxy-number-input__btn'
    this.incBtn.setAttribute('aria-label', 'Increase')
    this.incBtn.textContent = '+'
    this.incBtn.addEventListener('click', () => this.adjust(this.getStep()))

    this.append(this.decBtn, this.field, this.incBtn)
  }

  private getStep(): number {
    return parseNum(this.getAttribute('step'), 1) ?? 1
  }

  private getCurrent(): number {
    if (this.hasAttribute('value')) {
      return parseNum(this.getAttribute('value'), 0) ?? 0
    }
    return parseNum(this.getAttribute('default-value'), 0) ?? 0
  }

  private clamp(value: number): number {
    const min = parseNum(this.getAttribute('min'))
    const max = parseNum(this.getAttribute('max'))
    if (min !== undefined && value < min) value = min
    if (max !== undefined && value > max) value = max
    return value
  }

  private adjust(delta: number): void {
    if (this.hasAttribute('disabled')) return
    this.setValue(this.clamp(this.getCurrent() + delta))
  }

  private commitFromField(): void {
    if (this.hasAttribute('disabled') || !this.field) return
    this.setValue(this.clamp(Number(this.field.value)))
  }

  private setValue(next: number): void {
    this.setAttribute('value', String(next))
    this.sync()
    this.dispatchEvent(
      new CustomEvent('nuxy-number-input-change', { detail: { value: next }, bubbles: true })
    )
  }

  private sync(): void {
    syncHostClasses(this, 'nuxy-number-input')

    const current = this.getCurrent()
    const min = parseNum(this.getAttribute('min'))
    const max = parseNum(this.getAttribute('max'))
    const step = this.getStep()
    const disabled = this.hasAttribute('disabled')
    const id = this.getAttribute('id')

    if (this.field) {
      this.field.value = String(current)
      if (min !== undefined) this.field.min = String(min)
      else this.field.removeAttribute('min')
      if (max !== undefined) this.field.max = String(max)
      else this.field.removeAttribute('max')
      this.field.step = String(step)
      this.field.disabled = disabled
      if (id) this.field.id = id
      else this.field.removeAttribute('id')
    }

    if (this.decBtn) {
      this.decBtn.disabled = disabled || (min !== undefined && current <= min)
    }
    if (this.incBtn) {
      this.incBtn.disabled = disabled || (max !== undefined && current >= max)
    }
  }
}

if (!customElements.get('nuxy-number-input')) {
  customElements.define('nuxy-number-input', NuxyNumberInputElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-number-input': NuxyNumberInputElement
  }
}
