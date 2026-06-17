import '../Text/nuxy-portal.ts'
import './nuxy-select-option.ts'
import {
  LitElement,
  html,
  nothing,
  customElement,
  property,
  ref,
  type TemplateResult,
} from '@nuxyorg/core'
import type { SelectOption } from '../../utils/parse-options.ts'

/**
 * Presentational dropdown panel for `nuxy-select-box`: portals itself to
 * `document.body` (via `<nuxy-portal>`) and renders the optional search
 * input, the indicator bar, and the list of `nuxy-select-option` rows.
 *
 * Renders in light DOM so that once `nuxy-portal` moves its children into
 * `document.body`, the resulting markup (`.nuxy-select-box__dropdown`,
 * `.nuxy-select-box__search`, `.nuxy-select-box__options`, etc.) is
 * structurally identical to the pre-split single-file implementation.
 *
 * All positioning, scrolling, search filtering, and keyboard-navigation
 * logic remains owned by the host `nuxy-select-box` — this component is
 * purely a template + event-forwarding layer.
 */
@customElement('nuxy-select-dropdown')
export class NuxySelectDropdownElement extends LitElement {
  @property({ attribute: false })
  declare options: SelectOption[]

  @property({ type: String })
  declare value: string

  @property({ type: Number })
  declare focusedIndex: number

  @property({ type: Boolean, reflect: true })
  declare searchable: boolean

  @property({ type: String })
  declare searchQuery: string

  @property({ type: Number })
  declare top: number

  @property({ type: Number })
  declare left: number

  @property({ type: String })
  declare indicatorTransform: string

  @property({ type: String })
  declare indicatorHeight: string

  @property({ type: Boolean })
  declare indicatorVisible: boolean

  @property({ attribute: false })
  declare valueMatches: ((optionValue: unknown, current: string) => boolean) | undefined

  @property({ attribute: false })
  declare onDropdownRef: ((el: Element | undefined) => void) | undefined

  @property({ attribute: false })
  declare onSearchRef: ((el: Element | undefined) => void) | undefined

  @property({ attribute: false })
  declare onOptionsRef: ((el: Element | undefined) => void) | undefined

  @property({ attribute: false })
  declare onSearchInput: ((e: Event) => void) | undefined

  @property({ attribute: false })
  declare onSearchKeyDown: ((e: KeyboardEvent) => void) | undefined

  @property({ attribute: false })
  declare onOptionsMouseLeave: (() => void) | undefined

  @property({ attribute: false })
  declare onOptionSelect: ((value: string) => void) | undefined

  @property({ attribute: false })
  declare onOptionHoverEnter: ((index: number) => void) | undefined

  protected createRenderRoot(): HTMLElement {
    return this
  }

  render(): TemplateResult {
    const options = this.options ?? []
    const value = this.value ?? ''
    const matches = this.valueMatches ?? ((a: unknown, b: string) => String(a) === b)

    return html`
      <nuxy-portal>
        <div
          class="nuxy-select-box__dropdown"
          role="listbox"
          style="position: fixed; top: ${this.top}px; left: ${this
            .left}px; transform: none; margin: 0;"
          ${ref(this.onDropdownRef)}
        >
          ${this.searchable
            ? html`
                <div class="nuxy-select-box__search-wrapper">
                  <input
                    class="nuxy-select-box__search"
                    aria-label="Search options"
                    placeholder="Search…"
                    tabindex="-1"
                    .value=${this.searchQuery}
                    ${ref(this.onSearchRef)}
                    @mousedown=${(e: Event) => e.stopPropagation()}
                    @input=${this.onSearchInput}
                    @keydown=${this.onSearchKeyDown}
                  />
                </div>
              `
            : nothing}
          <div
            class="nuxy-select-box__options"
            ${ref(this.onOptionsRef)}
            @mouseleave=${this.onOptionsMouseLeave}
          >
            <div
              class="nuxy-select-box__indicator ${this.indicatorVisible ? 'visible' : ''}"
              style="transform: ${this.indicatorTransform}; height: ${this.indicatorHeight};"
            ></div>
            ${options.length === 0
              ? html`<div class="nuxy-select-box__no-results">No results</div>`
              : options.map((option, index) => {
                  const isFocused = index === this.focusedIndex
                  const isSelected = matches(option.value, value)
                  return html`
                    <nuxy-select-option
                      .optionValue=${option.value}
                      .label=${option.label}
                      .index=${index}
                      ?focused=${isFocused}
                      ?selected=${isSelected}
                      .onSelect=${this.onOptionSelect}
                      .onHoverEnter=${this.onOptionHoverEnter}
                    ></nuxy-select-option>
                  `
                })}
          </div>
        </div>
      </nuxy-portal>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-select-dropdown': NuxySelectDropdownElement
  }
}
