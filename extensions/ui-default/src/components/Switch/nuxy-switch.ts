import { LitElement, html, css, nothing, customElement, property, state } from '@nuxyorg/core'
import type { TemplateResult } from '@nuxyorg/core'

@customElement('nuxy-switch')
export class NuxySwitchElement extends LitElement {
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

    .nuxy-switch__track {
      width: 36px;
      height: 20px;
      border-radius: 10px;
      background: var(--syntax-comment);
      position: relative;
      transition: background 0.2s ease;
      flex-shrink: 0;
    }

    :host([checked]) .nuxy-switch__track {
      background: var(--syntax-operator);
    }

    .nuxy-switch__thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--syntax-variable);
      transition: transform 0.2s ease;
    }

    :host([checked]) .nuxy-switch__thumb {
      transform: translateX(16px);
    }

    .nuxy-switch__input {
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
      new CustomEvent('nuxy-switch-change', { detail: { checked: this.checked }, bubbles: true })
    )
  }

  private handleTrackClick(e: Event): void {
    e.preventDefault()
    if (this.disabled) return
    this.checked = !this.checked
    this.dispatchEvent(
      new CustomEvent('nuxy-switch-change', { detail: { checked: this.checked }, bubbles: true })
    )
  }

  render(): TemplateResult {
    return html`
      <input
        type="checkbox"
        role="switch"
        class="nuxy-switch__input"
        .checked=${this.checked}
        .disabled=${this.disabled}
        aria-checked=${String(this.checked)}
        @change=${this.handleChange}
      />
      <span class="nuxy-switch__track" aria-hidden="true" @click=${this.handleTrackClick}
        ><span class="nuxy-switch__thumb"></span
      ></span>
      ${this._labelHTML
        ? html`<span class="nuxy-switch__label" .innerHTML=${this._labelHTML}></span>`
        : nothing}
    `
  }
}
