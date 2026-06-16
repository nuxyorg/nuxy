import { LitElement, html, css, customElement } from '@nuxyorg/core'

// NOTE: nuxy-collapsible needs `:host([data-sep]) { border-top: 1px solid rgba(255,255,255,0.06); }`
// added to its static styles once it is migrated to Shadow DOM.

@customElement('nuxy-accordion')
export class NuxyAccordionElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
    }
  `

  render() {
    return html`<slot @slotchange=${this._onSlotChange}></slot>`
  }

  private _onSlotChange(e: Event): void {
    const slot = e.target as HTMLSlotElement
    slot.assignedElements().forEach((el, i) => el.toggleAttribute('data-sep', i > 0))
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-accordion': NuxyAccordionElement
  }
}
