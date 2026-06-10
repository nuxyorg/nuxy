import { LitElement, html, css, customElement, property } from '@nuxy/core'

@customElement('nuxy-label')
export class NuxyLabelElement extends LitElement {
  @property({ type: Boolean, reflect: true })
  declare required: boolean

  static styles = css`
    :host {
      display: block;
      font-size: var(--font-sm);
      font-weight: 500;
      color: var(--syntax-variable);
      margin-bottom: var(--space-1);
      user-select: none;
    }

    :host([required])::after {
      content: ' *';
      color: var(--syntax-invalid);
    }
  `

  render() {
    return html`<slot></slot>`
  }
}

@customElement('nuxy-helper-text')
export class NuxyHelperTextElement extends LitElement {
  @property({ type: String, reflect: true })
  declare variant: string

  static styles = css`
    :host {
      display: block;
      font-size: var(--font-sm);
      color: var(--syntax-comment);
      margin-top: var(--space-1);
      line-height: 1.4;
    }

    :host([variant='error']) {
      color: var(--syntax-invalid);
    }

    :host([variant='success']) {
      color: var(--syntax-green);
    }
  `

  render() {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-label': NuxyLabelElement
    'nuxy-helper-text': NuxyHelperTextElement
  }
}
