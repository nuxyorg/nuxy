import { LitElement, html, css, customElement, property } from '@nuxy/core'

@customElement('nuxy-list-item-text')
export class NuxyListItemTextElement extends LitElement {
  @property({ type: String, reflect: true })
  declare variant: string

  @property({ type: Boolean, reflect: true })
  declare active: boolean

  static styles = css`
    :host {
      display: block;
      min-width: 0;
      font-size: var(--font-md);
      transition: color 150ms;
      color: var(--syntax-variable);
    }

    :host([variant='success']) {
      color: var(--syntax-function);
    }

    :host([variant='error']) {
      color: var(--syntax-invalid);
    }
  `

  render() {
    return html`<nuxy-truncate ?active=${this.active}><slot></slot></nuxy-truncate>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-list-item-text': NuxyListItemTextElement
  }
}
