import { LitElement, html, css, customElement, property } from '@nuxyorg/core'

@customElement('nuxy-item-leading')
export class NuxyItemLeadingElement extends LitElement {
  @property({ type: String, reflect: true })
  declare size: string
  @property({ type: String })
  declare color: string

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border-radius: 6px;
      overflow: hidden;
      background: var(--bg-subtle, rgba(255, 255, 255, 0.06));
    }

    :host([size='sm']) {
      width: 24px;
      height: 24px;
    }

    :host([size='md']) {
      width: 32px;
      height: 32px;
    }

    :host([size='lg']) {
      width: 40px;
      height: 40px;
    }
  `

  updated(): void {
    if (this.color) this.style.background = this.color
    else this.style.removeProperty('background')
  }

  render() {
    return html`<slot></slot>`
  }
}
