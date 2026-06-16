import { LitElement, html, css, customElement, property } from '@nuxyorg/core'

@customElement('nuxy-card')
export class NuxyCardElement extends LitElement {
  @property({ type: Boolean, reflect: true })
  declare interactive: boolean

  static styles = css`
    :host {
      background-color: var(--bg-base);
      border: 1px solid var(--syntax-comment);
      border-radius: var(--radius-xl);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition:
        background-color 300ms,
        border-color 300ms,
        box-shadow 300ms;
    }

    :host([interactive]) {
      cursor: pointer;
    }

    :host([interactive]:hover) {
      border-color: var(--syntax-operator);
      background-color: rgba(255, 255, 255, 0.01);
    }
  `

  render() {
    return html`<slot></slot>`
  }
}

@customElement('nuxy-card-header')
export class NuxyCardHeaderElement extends LitElement {
  static styles = css`
    :host {
      padding: var(--space-5);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
  `

  render() {
    return html`<slot></slot>`
  }
}

@customElement('nuxy-card-body')
export class NuxyCardBodyElement extends LitElement {
  static styles = css`
    :host {
      padding: var(--space-5);
      flex: 1;
    }
  `

  render() {
    return html`<slot></slot>`
  }
}

@customElement('nuxy-card-footer')
export class NuxyCardFooterElement extends LitElement {
  static styles = css`
    :host {
      padding: var(--space-4) var(--space-5);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      background: rgba(255, 255, 255, 0.01);
    }
  `

  render() {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-card': NuxyCardElement
    'nuxy-card-header': NuxyCardHeaderElement
    'nuxy-card-body': NuxyCardBodyElement
    'nuxy-card-footer': NuxyCardFooterElement
  }
}
