import { LitElement, html, css, nothing, customElement, type TemplateResult } from '@nuxy/core'

@customElement('nuxy-pin-input')
export class NuxyPinInputElement extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      gap: var(--space-2);
      align-items: center;
    }

    .nuxy-pin-input__cell {
      width: 44px;
      height: 48px;
      text-align: center;
      font-size: var(--font-xl);
      font-weight: 600;
      font-family: monospace;
      background: transparent;
      border: 1.5px solid var(--syntax-comment);
      border-radius: var(--radius-md);
      color: var(--syntax-variable);
      outline: none;
      transition: border-color 0.15s ease;
      caret-color: var(--syntax-operator);
    }

    .nuxy-pin-input__cell:focus {
      border-color: var(--syntax-operator);
    }

    .nuxy-pin-input__cell--filled {
      border-color: rgba(255, 255, 255, 0.2);
    }

    .nuxy-pin-input__cell--error {
      border-color: var(--syntax-invalid);
    }

    .nuxy-pin-input__sep {
      color: var(--syntax-comment);
      font-size: var(--font-lg);
      padding: 0 var(--space-1);
    }
  `

  static get observedAttributes(): string[] {
    return ['length', 'value', 'default-value', 'disabled', 'error', 'mask', 'class']
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    super.attributeChangedCallback(name, oldVal, newVal)
    if (this.isConnected) {
      this.requestUpdate()
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

  private focusInput(idx: number): void {
    const inputs = this.renderRoot.querySelectorAll<HTMLInputElement>('.nuxy-pin-input__cell')
    inputs[idx]?.focus()
  }

  private onCellInput(idx: number, e: InputEvent): void {
    if (this.hasAttribute('disabled')) return
    const input = e.target as HTMLInputElement
    const val = input?.value ?? ''
    if (!val) return

    const char = val.slice(-1)
    const nextVal = this.getCurrent().split('')
    nextVal[idx] = char
    const finalVal = nextVal.join('').slice(0, this.getLength())

    this.commit(finalVal)

    if (idx < this.getLength() - 1 && char) {
      this.focusInput(idx + 1)
    }
  }

  private onCellKeyDown(idx: number, e: KeyboardEvent): void {
    if (e.key !== 'Backspace' || this.hasAttribute('disabled')) return

    const nextVal = this.getCurrent().split('')
    if (!nextVal[idx] && idx > 0) {
      this.focusInput(idx - 1)
      nextVal[idx - 1] = ''
    } else {
      nextVal[idx] = ''
    }

    this.commit(nextVal.join(''))
    e.preventDefault()
  }

  private commit(finalVal: string): void {
    this.setAttribute('value', finalVal)
    this.requestUpdate()
    this.dispatchEvent(
      new CustomEvent('nuxy-pin-input-change', { detail: { value: finalVal }, bubbles: true })
    )
    if (finalVal.length === this.getLength()) {
      this.dispatchEvent(
        new CustomEvent('nuxy-pin-input-complete', { detail: { value: finalVal }, bubbles: true })
      )
    }
  }

  private renderCell(idx: number, currentVal: string, length: number): TemplateResult {
    const disabled = this.hasAttribute('disabled')
    const error = this.hasAttribute('error')
    const mask = this.hasAttribute('mask')
    const val = currentVal[idx] || ''

    const cellClass = [
      'nuxy-pin-input__cell',
      val ? 'nuxy-pin-input__cell--filled' : '',
      error ? 'nuxy-pin-input__cell--error' : '',
    ]
      .filter(Boolean)
      .join(' ')

    return html`
      <input
        class=${cellClass}
        inputmode="numeric"
        pattern="[0-9]*"
        maxlength="1"
        aria-label=${`Digit ${idx + 1}`}
        type=${mask ? 'password' : 'text'}
        .value=${val}
        ?disabled=${disabled}
        @input=${(e: InputEvent) => this.onCellInput(idx, e)}
        @keydown=${(e: KeyboardEvent) => this.onCellKeyDown(idx, e)}
      />
    `
  }

  render(): TemplateResult {
    const length = this.getLength()
    const currentVal = this.getCurrent()
    const sepIndex = Math.floor(length / 2) - 1

    const cells: TemplateResult[] = []
    for (let idx = 0; idx < length; idx++) {
      cells.push(this.renderCell(idx, currentVal, length))
      if (idx === sepIndex && length > 4) {
        cells.push(html` <span class="nuxy-pin-input__sep" aria-hidden="true">−</span> `)
      }
    }

    return html`${cells}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-pin-input': NuxyPinInputElement
  }
}
