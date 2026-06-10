import { LitElement, html, css, nothing, customElement, property, state } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'

const CHECKMARK_ICON: TemplateResult = html`<svg
  class="nuxy-checkbox__checkmark"
  viewBox="0 0 12 9"
>
  <polyline points="1,5 4,8 11,1" />
</svg>`

@customElement('nuxy-checkbox')
export class NuxyCheckboxElement extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--space-3);
      cursor: pointer;
      user-select: none;
      font-size: var(--font-md);
      color: var(--syntax-variable);
    }

    :host([disabled]) {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .nuxy-checkbox__box {
      width: 16px;
      height: 16px;
      border: 1.5px solid var(--syntax-comment);
      border-radius: var(--radius-sm);
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition:
        border-color 0.15s ease,
        background 0.15s ease;
    }

    :host([checked]) .nuxy-checkbox__box {
      border-color: var(--syntax-operator);
      background: var(--syntax-operator);
    }

    .nuxy-checkbox__checkmark {
      display: none;
      width: 9px;
      height: 9px;
      stroke: #000;
      stroke-width: 2.5;
      fill: none;
    }

    :host([checked]) .nuxy-checkbox__checkmark {
      display: block;
    }

    .nuxy-checkbox__input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
      pointer-events: none;
    }
  `

  @property({ type: Boolean, reflect: true })
  declare checked: boolean
  @property({ type: Boolean, reflect: true })
  declare disabled: boolean

  @state()
  declare private _labelHTML: string

  connectedCallback(): void {
    // Capture initial label content before Lit replaces it
    this._labelHTML = this.innerHTML
    super.connectedCallback()
  }

  private handleChange(e: Event): void {
    if (this.disabled) return
    const input = e.target as HTMLInputElement
    this.checked = input.checked
    this.dispatchEvent(
      new CustomEvent('nuxy-checkbox-change', { detail: { checked: this.checked }, bubbles: true })
    )
  }

  private handleBoxClick(e: Event): void {
    e.preventDefault()
    if (this.disabled) return
    this.checked = !this.checked
    this.dispatchEvent(
      new CustomEvent('nuxy-checkbox-change', { detail: { checked: this.checked }, bubbles: true })
    )
  }

  render(): TemplateResult {
    return html`
      <input
        type="checkbox"
        class="nuxy-checkbox__input"
        .checked=${this.checked}
        .disabled=${this.disabled}
        aria-checked=${String(this.checked)}
        @change=${this.handleChange}
      />
      <span class="nuxy-checkbox__box" aria-hidden="true" @click=${this.handleBoxClick}
        >${CHECKMARK_ICON}</span
      >
      ${this._labelHTML
        ? html`<span class="nuxy-checkbox__label" .innerHTML=${this._labelHTML}></span>`
        : nothing}
    `
  }
}
