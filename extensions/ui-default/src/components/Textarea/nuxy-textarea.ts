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

  @property({ type: String }) name = ''
  @property({ type: String }) value = ''
  @property({ type: String }) placeholder = ''
  @property({ type: Boolean }) disabled = false
  @property({ type: Boolean }) readonly = false
  @property({ type: Boolean }) required = false
  @property({ type: Boolean }) autofocus = false
  @property({ type: String }) rows = ''
  @property({ type: String }) cols = ''
  @property({ type: String }) maxlength = ''
  @property({ type: String }) minlength = ''
  @property({ type: String }) id = ''
  @property({ attribute: 'aria-label', type: String }) ariaLabel = ''
  @property({ attribute: 'aria-invalid', type: String }) ariaInvalid = ''
  @property({ type: String }) tabindex = ''

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
