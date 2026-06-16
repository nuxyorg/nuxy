import { LitElement, html, css, customElement } from '@nuxyorg/core'

@customElement('nuxy-list-item-body')
export class NuxyListItemBodyElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-0);
      flex: 1;
      min-width: 0;
      padding-right: var(--space-3);
    }
  `

  render() {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-list-item-body': NuxyListItemBodyElement
  }
}
