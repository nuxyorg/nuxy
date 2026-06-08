import './index.css'
import { syncHostClasses } from '../../h.ts'

export class NuxyPinInputElement extends HTMLElement {
  private inputs: HTMLInputElement[] = []
  private builtLength = 0
  private sepEl: HTMLSpanElement | null = null

  static get observedAttributes(): string[] {
    return ['length', 'value', 'default-value', 'disabled', 'error', 'mask', 'class']
  }

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return
    if (name === 'length') {
      this.render()
    } else {
      this.sync()
    }
  }

  private getLength(): number {
    const raw = this.getAttribute('length')
    const n = raw === null ? 4 : Number(raw)
    return Number.isFinite(n) && n > 0 ? n : 4
  }

  private getCurrent(): string {
    if (this.hasAttribute('value')) {
      return this.getAttribute('value') ?? ''
    }
    return this.getAttribute('default-value') ?? ''
  }

  private render(): void {
    const length = this.getLength()
    syncHostClasses(this, 'nuxy-pin-input')

    if (this.builtLength !== length) {
      this.replaceChildren()
      this.inputs = []
      this.sepEl = null
      const sepIndex = Math.floor(length / 2) - 1

      for (let idx = 0; idx < length; idx++) {
        const input = document.createElement('input')
        input.className = 'nuxy-pin-input__cell'
        input.inputMode = 'numeric'
        input.pattern = '[0-9]*'
        input.maxLength = 1
        input.setAttribute('aria-label', `Digit ${idx + 1}`)
        input.addEventListener('input', () => this.onCellInput(idx))
        input.addEventListener('keydown', (e) => this.onCellKeyDown(e, idx))
        this.inputs.push(input)
        this.appendChild(input)

        if (idx === sepIndex && length > 4) {
          this.sepEl = document.createElement('span')
          this.sepEl.className = 'nuxy-pin-input__sep'
          this.sepEl.setAttribute('aria-hidden', 'true')
          this.sepEl.textContent = '−'
          this.appendChild(this.sepEl)
        }
      }

      this.builtLength = length
    }

    this.sync()
  }

  private sync(): void {
    const currentVal = this.getCurrent()
    const disabled = this.hasAttribute('disabled')
    const error = this.hasAttribute('error')
    const mask = this.hasAttribute('mask')

    for (let idx = 0; idx < this.inputs.length; idx++) {
      const input = this.inputs[idx]
      const val = currentVal[idx] || ''
      input.type = mask ? 'password' : 'text'
      input.value = val
      input.disabled = disabled
      input.className = [
        'nuxy-pin-input__cell',
        val ? 'nuxy-pin-input__cell--filled' : '',
        error ? 'nuxy-pin-input__cell--error' : '',
      ]
        .filter(Boolean)
        .join(' ')
    }
  }

  private onCellInput(idx: number): void {
    if (this.hasAttribute('disabled')) return
    const input = this.inputs[idx]
    const val = input?.value ?? ''
    if (!val) return

    const char = val.slice(-1)
    const nextVal = this.getCurrent().split('')
    nextVal[idx] = char
    const finalVal = nextVal.join('').slice(0, this.getLength())

    this.commit(finalVal)

    if (idx < this.getLength() - 1 && char) {
      this.inputs[idx + 1]?.focus()
    }
  }

  private onCellKeyDown(e: KeyboardEvent, idx: number): void {
    if (e.key !== 'Backspace' || this.hasAttribute('disabled')) return

    const nextVal = this.getCurrent().split('')
    if (!nextVal[idx] && idx > 0) {
      this.inputs[idx - 1]?.focus()
      nextVal[idx - 1] = ''
    } else {
      nextVal[idx] = ''
    }

    this.commit(nextVal.join(''))
    e.preventDefault()
  }

  private commit(finalVal: string): void {
    this.setAttribute('value', finalVal)
    this.sync()
    this.dispatchEvent(
      new CustomEvent('nuxy-pin-input-change', { detail: { value: finalVal }, bubbles: true })
    )
    if (finalVal.length === this.getLength()) {
      this.dispatchEvent(
        new CustomEvent('nuxy-pin-input-complete', { detail: { value: finalVal }, bubbles: true })
      )
    }
  }
}

if (!customElements.get('nuxy-pin-input')) {
  customElements.define('nuxy-pin-input', NuxyPinInputElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-pin-input': NuxyPinInputElement
  }
}
