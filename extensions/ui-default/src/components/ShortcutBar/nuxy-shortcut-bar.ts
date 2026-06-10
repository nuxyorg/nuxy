import { LitElement, html, css, customElement } from '@nuxy/core'

@customElement('nuxy-shortcut-bar')
export class NuxyShortcutBarElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-5);
      padding: var(--space-3) var(--space-5);
      border-top: 1px solid var(--syntax-comment);
    }
  `

  render() {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-shortcut-bar': NuxyShortcutBarElement
  }
}
