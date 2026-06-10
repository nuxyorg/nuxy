import { LitElement, html, css, customElement, property } from '@nuxy/core'

@customElement('nuxy-alert')
export class NuxyAlertElement extends LitElement {
  @property({ type: String, reflect: true }) variant = 'info'

  static styles = css`
    :host {
      padding: 7px 14px;
      font-size: 12px;
      border-top: 1px solid transparent;
    }

    :host([variant='danger']) {
      color: var(--color-danger, #e55);
      background: rgba(220, 50, 50, 0.08);
      border-top-color: rgba(220, 50, 50, 0.2);
    }

    :host([variant='warning']) {
      color: var(--color-warning, #eab308);
      background: rgba(234, 179, 8, 0.08);
      border-top-color: rgba(234, 179, 8, 0.2);
    }

    :host([variant='info']) {
      color: var(--color-info, #3b82f6);
      background: rgba(59, 130, 246, 0.08);
      border-top-color: rgba(59, 130, 246, 0.2);
    }

    :host([variant='success']) {
      color: var(--color-success, #22c55e);
      background: rgba(34, 197, 94, 0.08);
      border-top-color: rgba(34, 197, 94, 0.2);
    }
  `

  render() {
    return html`<slot></slot>`
  }
}
