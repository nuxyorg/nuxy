import { LitElement, html, customElement, property, ref, type TemplateResult } from '@nuxyorg/core'

/**
 * Presentational trigger button for `nuxy-select-box`.
 *
 * Renders in light DOM (`createRenderRoot` returns `this`) so that the button
 * element stays directly queryable via `nuxy-select-box`'s own shadow root
 * (e.g. `el.shadowRoot.querySelector('.nuxy-select-box__trigger')`), exactly
 * as it was before this element existed as a standalone component.
 *
 * All state (open/closed, current label) and behavior (open/close requests)
 * live in the host `nuxy-select-box` — this component only renders markup
 * and forwards DOM events via callback properties.
 */
@customElement('nuxy-select-trigger')
export class NuxySelectTriggerElement extends LitElement {
  @property({ type: String })
  declare label: string

  @property({ type: Boolean, reflect: true })
  declare open: boolean

  @property({ attribute: false })
  declare onTriggerClick: ((e: MouseEvent) => void) | undefined

  @property({ attribute: false })
  declare onTriggerMouseDown: ((e: MouseEvent) => void) | undefined

  @property({ attribute: false })
  declare onTriggerRef: ((el: Element | undefined) => void) | undefined

  protected createRenderRoot(): HTMLElement {
    return this
  }

  render(): TemplateResult {
    return html`
      <button
        type="button"
        tabindex="-1"
        class=${['nuxy-select-box__trigger', this.open ? 'nuxy-select-box__trigger--open' : '']
          .filter(Boolean)
          .join(' ')}
        ${ref(this.onTriggerRef)}
        @mousedown=${this.onTriggerMouseDown}
        @click=${this.onTriggerClick}
      >
        <span class="nuxy-select-box__value">${this.label}</span>
        <span
          class=${['nuxy-select-box__chevron', this.open ? 'nuxy-select-box__chevron--open' : '']
            .filter(Boolean)
            .join(' ')}
          >▾</span
        >
      </button>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-select-trigger': NuxySelectTriggerElement
  }
}
