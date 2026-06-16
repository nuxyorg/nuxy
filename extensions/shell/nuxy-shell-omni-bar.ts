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
} from '@nuxyorg/core'

@customElement('nuxy-shell-omni-bar')
export class NuxyShellOmniBarElement extends LitElement {
  static styles = css`
    :host {
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: 10px var(--space-5);
      min-height: 46px;
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

    .nuxy-shell-omni-bar__icon-inner {
      display: flex;
      align-items: center;
    }

    .nuxy-shell-omni-bar__spinner-wrap {
      display: inline-flex;
      opacity: 0;
      scale: 0.7;
      transition:
        opacity 200ms ease,
        scale 200ms ease;
    }

    :host([loading]) .nuxy-shell-omni-bar__spinner-wrap {
      opacity: 1;
      scale: 1;
    }

    @keyframes nuxy-hold-fill {
      from {
        transform: scaleX(0);
      }
      to {
        transform: scaleX(1);
      }
    }

    .nuxy-shell-omni-bar__hold-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      pointer-events: none;
      overflow: hidden;
      z-index: var(--z-1, 1);
    }

    .nuxy-shell-omni-bar__hold-progress-bar {
      width: 100%;
      height: 100%;
      background: var(--color-accent, var(--syntax-operator));
      transform: scaleX(0);
      transform-origin: left center;
      animation: nuxy-hold-fill var(--nuxy-hold-ms, 600ms) linear forwards;
      border-radius: 0 2px 2px 0;
    }
  `

  @property()
  declare query: string
  @property({ type: Boolean, reflect: true })
  declare static: boolean
  @property({ attribute: 'active-tool-name' })
  declare activeToolName: string
  @property()
  declare placeholder: string
  @property({ attribute: 'aria-label' })
  declare ariaLabel: string
  @property({ type: Boolean })
  declare disabled: boolean
  @property({ type: Boolean })
  declare loading: boolean
  @property({ type: Number, attribute: 'hold-ms' })
  declare holdMs: number | null

  @state()
  declare private _searchIconHtml: string

  @queryDecorator('input') private _inputEl!: HTMLInputElement | null

  set searchIconHtml(html: string) {
    this._searchIconHtml = html
  }

  get nativeInput(): HTMLInputElement | null {
    return this._inputEl ?? null
  }

  updated(changed: Map<string, unknown>): void {
    if (!this._inputEl) return
    if (changed.has('query') && this._inputEl.value !== this.query) {
      this._inputEl.value = this.query
    }
    if (this._inputEl.placeholder !== this.placeholder) {
      this._inputEl.placeholder = this.placeholder
    }
  }

  private _renderIcon(): TemplateResult {
    if (this._searchIconHtml) {
      return html`<span
        class="nuxy-shell-omni-bar__icon-inner"
        .innerHTML=${this._searchIconHtml}
      ></span>`
    }
    return html`<nuxy-icon name="Search" size="16" opacity="1"></nuxy-icon>`
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
        spellcheck="false"
        .value=${this.query}
        .placeholder=${this.placeholder}
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
        <span class="nuxy-shell-omni-bar__spinner-wrap" aria-hidden="true">
          <nuxy-spinner size="sm"></nuxy-spinner>
        </span>
      </div>
      ${this.holdMs != null
        ? html`
            <div class="nuxy-shell-omni-bar__hold-progress">
              <div
                class="nuxy-shell-omni-bar__hold-progress-bar"
                style="--nuxy-hold-ms:${this.holdMs}ms"
              ></div>
            </div>
          `
        : nothing}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-shell-omni-bar': NuxyShellOmniBarElement
  }
}
