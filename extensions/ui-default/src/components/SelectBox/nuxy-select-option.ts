import {
  LitElement,
  html,
  nothing,
  customElement,
  property,
  type TemplateResult,
} from '@nuxyorg/core'

/**
 * Presentational single option row for the `nuxy-select-box` dropdown.
 *
 * Renders in light DOM so the rendered `[role="option"]` element stays a
 * direct child of `.nuxy-select-box__options` (queried via `document.body`
 * once `nuxy-select-dropdown` is portaled), matching pre-split markup.
 *
 * Selection/focus/hover state and the `select` action live in the host
 * `nuxy-select-box` — this component only renders and forwards events.
 */
@customElement('nuxy-select-option')
export class NuxySelectOptionElement extends LitElement {
  @property({ type: String })
  declare optionValue: string

  @property({ type: String })
  declare label: string

  @property({ type: Number })
  declare index: number

  @property({ type: Boolean, reflect: true })
  declare focused: boolean

  @property({ type: Boolean, reflect: true })
  declare selected: boolean

  @property({ attribute: false })
  declare onSelect: ((value: string) => void) | undefined

  @property({ attribute: false })
  declare onHoverEnter: ((index: number) => void) | undefined

  protected createRenderRoot(): HTMLElement {
    return this
  }

  private handleClick = (e: Event): void => {
    e.stopPropagation()
    this.onSelect?.(this.optionValue)
  }

  private handleMouseEnter = (): void => {
    this.onHoverEnter?.(this.index)
  }

  render(): TemplateResult {
    return html`
      <div
        role="option"
        aria-selected=${String(this.selected)}
        data-option-index=${this.index}
        class=${[
          'nuxy-select-box__option',
          this.focused ? 'nuxy-select-box__option--focused' : '',
          this.selected ? 'nuxy-select-box__option--selected' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        @click=${this.handleClick}
        @mouseenter=${this.handleMouseEnter}
      >
        <span class="nuxy-select-box__option-label">${this.label}</span>
        ${this.selected ? html`<span class="nuxy-select-box__option-check">✓</span>` : nothing}
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-select-option': NuxySelectOptionElement
  }
}
