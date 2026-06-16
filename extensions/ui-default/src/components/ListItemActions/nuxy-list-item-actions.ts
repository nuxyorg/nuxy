import { LitElement, html, css, customElement } from '@nuxyorg/core'

@customElement('nuxy-list-item-actions')
export class NuxyListItemActionsElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      flex-shrink: 0;
    }
  `

  render() {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-list-item-actions': NuxyListItemActionsElement
  }
}
