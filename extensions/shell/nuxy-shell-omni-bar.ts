import {
  LitElement,
  html,
  css,
  nothing,
  customElement,
  property,
  state,
  query as queryDecorator,
  type TemplateResult,
} from '@nuxy/core'

const DEFAULT_SEARCH_ICON =
  "<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/></svg>"

@customElement('nuxy-shell-omni-bar')
export class NuxyShellOmniBarElement extends LitElement {
  static styles = css`
    :host {
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: 13px var(--space-5);
      min-height: 52px;
      cursor: grab;
    }

    :host(:active) {
      cursor: grabbing;
    }

    :host([static]) {
      cursor: default;
    }

    .nuxy-shell-omni-bar__icon {
      display: flex;
      color: var(--syntax-comment);
      flex-shrink: 0;
      z-index: var(--z-1);
    }

    .nuxy-shell-omni-bar__sep {
      color: var(--syntax-comment);
      font-size: var(--font-xl);
      line-height: 1;
      user-select: none;
      flex-shrink: 0;
      z-index: var(--z-1);
    }

    .nuxy-shell-omni-bar__tool-name {
      font-size: var(--font-body);
      color: var(--syntax-operator);
      font-weight: 500;
      letter-spacing: 0.01em;
      flex-shrink: 0;
      z-index: var(--z-1);
    }

    .nuxy-shell-omni-bar__input {
      flex: 1;
      min-width: 0;
      background: transparent;
      border: none;
      outline: none;
      color: var(--syntax-variable);
      font-size: var(--font-body);
      font-family: inherit;
      caret-color: var(--syntax-operator);
      z-index: var(--z-1);
    }

    .nuxy-shell-omni-bar__input::placeholder {
      color: var(--syntax-keyword);
    }

    .nuxy-shell-omni-bar__input:disabled {
      pointer-events: none;
    }

    .nuxy-shell-omni-bar__portal {
      display: flex;
      align-items: center;
      padding-right: var(--space-3);
      flex-shrink: 0;
      margin-left: auto;
    }
  `

  @property() query = ''
  @property({ type: Boolean, reflect: true }) static = false
  @property({ attribute: 'active-tool-name' }) activeToolName = ''
  @property() placeholder = ''
  @property({ attribute: 'aria-label' }) ariaLabel = ''
  @property({ type: Boolean }) disabled = false
  @property({ type: Boolean }) loading = false

  @state() private _searchIconHtml = ''

  @queryDecorator('input') private _inputEl!: HTMLInputElement | null

  set searchIconHtml(html: string) {
    this._searchIconHtml = html
  }

  get nativeInput(): HTMLInputElement | null {
    return this._inputEl ?? null
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('query') && this._inputEl && this._inputEl.value !== this.query) {
      this._inputEl.value = this.query
    }
  }

  private _renderIcon(): TemplateResult {
    const htmlStr = this._searchIconHtml || DEFAULT_SEARCH_ICON
    return html`<span style="display:flex;align-items:center" .innerHTML=${htmlStr}></span>`
  }

  render(): TemplateResult {
    const hasToolName = Boolean(this.activeToolName)

    return html`
      <span class="nuxy-shell-omni-bar__icon" aria-hidden="true"> ${this._renderIcon()} </span>
      ${hasToolName
        ? html`
            <span class="nuxy-shell-omni-bar__sep">›</span>
            <span class="nuxy-shell-omni-bar__tool-name">${this.activeToolName}</span>
            <span class="nuxy-shell-omni-bar__sep">›</span>
          `
        : nothing}
      <input
        class="nuxy-shell-omni-bar__input"
        autofocus
        .value=${this.query}
        placeholder=${this.placeholder || nothing}
        aria-label=${this.ariaLabel || nothing}
        ?disabled=${this.disabled}
        @input=${(e: Event) => {
          this.query = (e.target as HTMLInputElement).value
          this.dispatchEvent(
            new CustomEvent('nuxy-omni-input', {
              detail: { value: this.query },
              bubbles: true,
              composed: true,
            })
          )
        }}
        @keydown=${(e: KeyboardEvent) => {
          this.dispatchEvent(
            new CustomEvent('nuxy-omni-keydown', {
              detail: { nativeEvent: e },
              bubbles: true,
              composed: true,
            })
          )
        }}
      />
      <div class="nuxy-shell-omni-bar__portal">
        <slot></slot>
        ${this.loading ? html`<nuxy-spinner size="sm"></nuxy-spinner>` : nothing}
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-shell-omni-bar': NuxyShellOmniBarElement
  }
}
