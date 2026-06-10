import { LitElement, html, css, customElement, property } from '@nuxy/core'

@customElement('nuxy-list-item-text')
export class NuxyListItemTextElement extends LitElement {
  @property({ type: String, reflect: true }) variant = 'default'

  static styles = css`
    :host {
      font-size: var(--font-md);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      transition: color 150ms;
      color: var(--syntax-variable);
    }

    :host([variant='success']) {
      color: var(--syntax-function);
    }
  `

  render() {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-list-item-text': NuxyListItemTextElement
  }
}
