import { LitElement, html, css, customElement, property } from '@nuxy/core'

@customElement('nuxy-list-item')
export class NuxyListItemElement extends LitElement {
  @property({ type: Boolean, reflect: true }) active = false

  static styles = css`
    :host {
      padding: var(--space-4) var(--space-5);
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      transition:
        background-color 150ms,
        border-color 150ms;
      border-left: 2px solid transparent;
    }

    :host([active]) {
      background-color: var(--syntax-comment);
      border-left-color: var(--syntax-operator);
    }

    :host(:not([active]):hover) {
      background-color: var(--syntax-comment);
      border-left-color: var(--syntax-comment);
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
