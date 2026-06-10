import { LitElement, html, css, customElement } from '@nuxy/core'

@customElement('nuxy-code')
export class NuxyCodeElement extends LitElement {
  static styles = css`
    :host {
      display: inline;
      font-family: monospace;
      font-size: 0.875em;
      padding: 1px 5px;
      border-radius: var(--radius-sm);
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--syntax-function);
      word-break: break-word;
    }
  `

  render() {
    return html`<slot></slot>`
  }
}
