import { LitElement, html, css, customElement } from '@nuxyorg/core'

@customElement('nuxy-visually-hidden')
export class NuxyVisuallyHiddenElement extends LitElement {
  static styles = css`
    :host {
      border: 0;
      clip: rect(0 0 0 0);
      height: 1px;
      margin: -1px;
      overflow: hidden;
      padding: 0;
      position: absolute;
      width: 1px;
      white-space: nowrap;
      word-wrap: normal;
    }
  `

  render() {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-visually-hidden': NuxyVisuallyHiddenElement
  }
}
