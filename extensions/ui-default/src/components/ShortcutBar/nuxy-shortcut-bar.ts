import { LitElement, html, css, customElement } from '@nuxyorg/core'
import { footerBarHostStyles } from '../../styles/footer-bar-layout.ts'

@customElement('nuxy-shortcut-bar')
export class NuxyShortcutBarElement extends LitElement {
  static styles = [
    footerBarHostStyles,
    css`
      :host {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-5);
      }
    `,
  ]

  render() {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-shortcut-bar': NuxyShortcutBarElement
  }
}
