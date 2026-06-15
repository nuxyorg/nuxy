import { LitElement, html, css, customElement, property } from '@nuxy/core'

@customElement('nuxy-list-item')
export class NuxyListItemElement extends LitElement {
  @property({ type: Boolean, reflect: true })
  declare active: boolean

  static styles = css`
    :host {
      padding: var(--space-4) var(--space-5);
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      transition: background-color 150ms;
      position: relative;
    }
  `

  render() {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-list-item': NuxyListItemElement
  }
}
