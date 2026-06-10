import { LitElement, html, css, nothing, customElement, property, ref } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'

const MIRROR_ATTRS = [
  'type',
  'name',
  'value',
  'placeholder',
  'disabled',
  'readonly',
  'required',
  'autocomplete',
  'autofocus',
  'min',
  'max',
  'step',
  'pattern',
  'inputmode',
  'id',
  'aria-label',
  'aria-invalid',
  'tabindex',
]

@customElement('nuxy-input')
export class NuxyInputElement extends LitElement {
  static styles = css`
    :host {
      display: contents;
    }

    input {
      display: flex;
      height: 36px;
      width: 100%;
      border-radius: var(--radius-md);
      border: 1px solid var(--syntax-comment);
      background: transparent;
      padding: var(--space-1) var(--space-4);
      font-size: var(--font-md);
      color: var(--syntax-variable);
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      transition:
        border-color 150ms,
        box-shadow 150ms;
      outline: none;
      box-sizing: border-box;
    }

    input::placeholder {
      color: color-mix(in srgb, var(--syntax-keyword) 60%, transparent);
    }

    input:focus-visible {
      box-shadow: 0 0 0 1px var(--syntax-operator);
    }

    input:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  `

  @property({ type: String })
  declare type: string
  @property({ type: String })
  declare name: string
  @property({ type: String })
  declare value: string
  @property({ type: String })
  declare placeholder: string
  @property({ type: Boolean })
  declare disabled: boolean
  @property({ type: Boolean })
  declare readonly: boolean
  @property({ type: Boolean })
  declare required: boolean
  @property({ type: String })
  declare autocomplete: string
  @property({ type: Boolean })
  declare autofocus: boolean
  @property({ type: String })
  declare min: string
  @property({ type: String })
  declare max: string
  @property({ type: String })
  declare step: string
  @property({ type: String })
  declare pattern: string
  @property({ type: String })
  declare inputmode: string
  @property({ type: String })
  declare id: string
  @property({ attribute: 'aria-label', type: String })
  declare ariaLabel: string
  @property({ attribute: 'aria-invalid', type: String })
  declare ariaInvalid: string
  @property({ type: String })
  declare tabindex: string

  private _inputRef: HTMLInputElement | null = null

  private onInputRef = (el: Element | undefined): void => {
    this._inputRef = (el as HTMLInputElement | null | undefined) ?? null
  }

  get nativeInput(): HTMLInputElement | null {
    return this._inputRef
  }

  render(): TemplateResult {
    return html`
      <input
        type=${this.type || nothing}
        name=${this.name || nothing}
        placeholder=${this.placeholder || nothing}
        ?disabled=${this.disabled || this.hasAttribute('disabled')}
        ?readonly=${this.readonly || this.hasAttribute('readonly')}
        ?required=${this.required || this.hasAttribute('required')}
        autocomplete=${this.autocomplete || nothing}
        ?autofocus=${this.autofocus}
        min=${this.min || nothing}
        max=${this.max || nothing}
        step=${this.step || nothing}
        pattern=${this.pattern || nothing}
        inputmode=${this.inputmode || nothing}
        id=${this.id || nothing}
        aria-label=${this.ariaLabel || nothing}
        aria-invalid=${this.ariaInvalid || nothing}
        tabindex=${this.tabindex || nothing}
        ${ref(this.onInputRef)}
      />
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-input': NuxyInputElement
  }
}
