import { LitElement, html, css, nothing, customElement, property, ref } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'

@customElement('nuxy-textarea')
export class NuxyTextareaElement extends LitElement {
  static styles = css`
    :host {
      display: contents;
    }

    textarea {
      width: 100%;
      padding: var(--space-3) var(--space-4);
      background: transparent;
      border: 1px solid var(--syntax-comment);
      border-radius: var(--radius-md);
      color: var(--syntax-variable);
      font-size: var(--font-md);
      font-family: inherit;
      line-height: 1.5;
      resize: vertical;
      min-height: 72px;
      box-sizing: border-box;
      transition: border-color 0.15s ease;
      outline: none;
    }

    textarea:focus {
      border-color: var(--syntax-operator);
    }

    textarea:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      resize: none;
    }

    textarea::placeholder {
      color: var(--syntax-comment);
    }
  `

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
  @property({ type: Boolean })
  declare autofocus: boolean
  @property({ type: String })
  declare rows: string
  @property({ type: String })
  declare cols: string
  @property({ type: String })
  declare maxlength: string
  @property({ type: String })
  declare minlength: string
  @property({ type: String })
  declare id: string
  @property({ attribute: 'aria-label', type: String })
  declare ariaLabel: string
  @property({ attribute: 'aria-invalid', type: String })
  declare ariaInvalid: string
  @property({ type: String })
  declare tabindex: string

  private _textareaRef: HTMLTextAreaElement | null = null

  private onTextareaRef = (el: Element | undefined): void => {
    this._textareaRef = (el as HTMLTextAreaElement | null | undefined) ?? null
  }

  get nativeTextarea(): HTMLTextAreaElement | null {
    return this._textareaRef
  }

  render(): TemplateResult {
    return html`
      <textarea
        name=${this.name || nothing}
        placeholder=${this.placeholder || nothing}
        ?disabled=${this.disabled || this.hasAttribute('disabled')}
        ?readonly=${this.readonly || this.hasAttribute('readonly')}
        ?required=${this.required || this.hasAttribute('required')}
        ?autofocus=${this.autofocus}
        rows=${this.rows || nothing}
        cols=${this.cols || nothing}
        maxlength=${this.maxlength || nothing}
        minlength=${this.minlength || nothing}
        id=${this.id || nothing}
        aria-label=${this.ariaLabel || nothing}
        aria-invalid=${this.ariaInvalid || nothing}
        tabindex=${this.tabindex || nothing}
        ${ref(this.onTextareaRef)}
      ></textarea>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-textarea': NuxyTextareaElement
  }
}
