import { LitElement, html, css, nothing, customElement, property, state, ref } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'

const MIRROR_ATTRS = [
  'placeholder',
  'disabled',
  'name',
  'autocomplete',
  'autofocus',
  'aria-label',
  'tabindex',
]

@customElement('nuxy-search-input')
export class NuxySearchInputElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      background: transparent;
      border: 1px solid var(--syntax-comment);
      border-radius: var(--radius-md);
      transition: border-color 0.15s ease;
    }

    :host(:focus-within) {
      border-color: var(--syntax-operator);
    }

    .nuxy-search-input__icon {
      color: var(--syntax-comment);
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .nuxy-search-input__field {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--syntax-variable);
      font-size: var(--font-md);
      font-family: inherit;
      outline: none;
      min-width: 0;
    }

    .nuxy-search-input__field::placeholder {
      color: var(--syntax-comment);
    }

    .nuxy-search-input__clear {
      background: transparent;
      border: none;
      color: var(--syntax-comment);
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 0;
      opacity: 0.6;
      transition: opacity 0.15s ease;
      flex-shrink: 0;
    }

    .nuxy-search-input__clear:hover {
      opacity: 1;
    }
  `

  @property({ type: String }) value = ''
  @property({ type: String }) placeholder = ''
  @property({ type: Boolean }) disabled = false
  @property({ type: String }) name = ''
  @property({ type: String }) autocomplete = ''
  @property({ type: Boolean }) autofocus = false
  @property({ attribute: 'aria-label', type: String }) ariaLabel = ''
  @property({ type: String }) tabindex = ''

  @state() private hasValue = false

  private fieldRef: HTMLInputElement | null = null

  connectedCallback(): void {
    super.connectedCallback()
    this.hasValue = (this.value || this.getAttribute('value') || '').length > 0
  }

  private onFieldRef = (el: Element | undefined): void => {
    this.fieldRef = (el as HTMLInputElement | null | undefined) ?? null
  }

  get nativeInput(): HTMLInputElement | null {
    return this.fieldRef
  }

  private onInput(e: Event): void {
    const input = e.target as HTMLInputElement
    this.hasValue = input.value.length > 0
    if (!this.hasValue) this.removeAttribute('value')
  }

  private clear(): void {
    if (!this.fieldRef || this.disabled || this.hasAttribute('disabled')) return
    this.fieldRef.value = ''
    this.hasValue = false
    this.removeAttribute('value')
    this.fieldRef.dispatchEvent(new Event('input', { bubbles: true }))
    this.dispatchEvent(new CustomEvent('nuxy-search-clear', { bubbles: true }))
  }

  render(): TemplateResult {
    const val = this.getAttribute('value')
    const disabled = this.disabled || this.hasAttribute('disabled')

    return html`
      <span class="nuxy-search-input__icon" aria-hidden="true">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>
      <input
        type="text"
        class="nuxy-search-input__field"
        .value=${val ?? ''}
        ?disabled=${disabled}
        placeholder=${this.placeholder || this.getAttribute('placeholder') || ''}
        name=${this.name || this.getAttribute('name') || ''}
        autocomplete=${this.autocomplete || this.getAttribute('autocomplete') || ''}
        ?autofocus=${this.autofocus || this.hasAttribute('autofocus')}
        aria-label=${this.ariaLabel || this.getAttribute('aria-label') || ''}
        tabindex=${this.tabindex || this.getAttribute('tabindex') || ''}
        ${ref(this.onFieldRef)}
        @input=${this.onInput}
      />
      <button
        type="button"
        class="nuxy-search-input__clear"
        aria-label="Clear search"
        style=${!this.hasValue ? 'display:none' : ''}
        @click=${this.clear}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-search-input': NuxySearchInputElement
  }
}
