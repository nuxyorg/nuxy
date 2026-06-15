import { LitElement, html, css, nothing, customElement, property } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'

export interface RadioGroupOption {
  value: string
  label: string
  disabled?: boolean
}

function parseOptions(raw: string | null): RadioGroupOption[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as RadioGroupOption[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

@customElement('nuxy-radio-group')
export class NuxyRadioGroupElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    :host([orientation='horizontal']) {
      flex-direction: row;
      flex-wrap: wrap;
      gap: var(--space-4);
    }

    .nuxy-radio {
      display: inline-flex;
      align-items: center;
      gap: var(--space-3);
      cursor: pointer;
      user-select: none;
      font-size: var(--font-md);
      color: var(--syntax-variable);
    }

    .nuxy-radio--disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .nuxy-radio__circle {
      width: 16px;
      height: 16px;
      border: 1.5px solid var(--syntax-comment);
      border-radius: 50%;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: border-color 0.15s ease;
    }

    .nuxy-radio--checked .nuxy-radio__circle {
      border-color: var(--syntax-operator);
    }

    .nuxy-radio__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--syntax-operator);
      opacity: 0;
      transition: opacity 0.15s ease;
    }

    .nuxy-radio--checked .nuxy-radio__dot {
      opacity: 1;
    }

    .nuxy-radio__input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
      pointer-events: none;
    }
  `

  @property({ type: String })
  declare options: string
  @property({ type: String })
  declare value: string
  @property({ type: String })
  declare name: string
  @property({ type: String, reflect: true })
  declare orientation: string
  @property({ type: Boolean })
  declare disabled: boolean

  private groupName = ''

  connectedCallback(): void {
    super.connectedCallback()
    this.setAttribute('role', 'radiogroup')
  }

  private select(optValue: string, optDisabled?: boolean): void {
    if (this.disabled || optDisabled) return
    this.value = optValue
    this.dispatchEvent(
      new CustomEvent('nuxy-radio-group-change', { detail: { value: optValue }, bubbles: true })
    )
  }

  render(): TemplateResult {
    const options = parseOptions(this.options || this.getAttribute('options'))
    const selected = (this.value || this.getAttribute('value')) ?? ''
    const disabled = this.disabled || this.hasAttribute('disabled')

    this.groupName = this.getAttribute('name') ?? `nuxy-radio-${crypto.randomUUID().slice(0, 8)}`

    return html`
      ${options.map((opt) => {
        const isChecked = selected === opt.value
        const isDisabled = disabled || Boolean(opt.disabled)
        return html`
          <label
            class=${[
              'nuxy-radio',
              isChecked ? 'nuxy-radio--checked' : '',
              isDisabled ? 'nuxy-radio--disabled' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <input
              type="radio"
              class="nuxy-radio__input"
              name=${this.groupName}
              value=${opt.value}
              .checked=${isChecked}
              ?disabled=${isDisabled}
              aria-checked=${String(isChecked)}
              @change=${() => this.select(opt.value, opt.disabled)}
            />
            <span
              class="nuxy-radio__circle"
              aria-hidden="true"
              @click=${(e: MouseEvent) => {
                e.preventDefault()
                this.select(opt.value, opt.disabled)
              }}
            >
              <span class="nuxy-radio__dot"></span>
            </span>
            <span>${opt.label}</span>
          </label>
        `
      })}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-radio-group': NuxyRadioGroupElement
  }
}
