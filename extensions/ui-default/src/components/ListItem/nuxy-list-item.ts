import { LitElement, html, css, customElement, property } from '@nuxyorg/core'

@customElement('nuxy-list-item')
export class NuxyListItemElement extends LitElement {
  @property({ type: Boolean, reflect: true })
  declare active: boolean

  protected updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties)
    if (changedProperties.has('active')) {
      console.log('E2E Debug: list-item active changed to', this.active, 'for text', this.textContent?.trim())
      if (this.active) {
        this.classList.add('nuxy-list-item--active')
      } else {
        this.classList.remove('nuxy-list-item--active')
      }
    }
  }

  static styles = css`
    :host {
      padding: calc(var(--space-4) - 2px) var(--space-5);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      cursor: pointer;
      position: relative;
    }

    :host::before {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: var(--space-2);
      right: var(--space-2);
      background-color: var(--syntax-comment);
      border-radius: var(--radius-md);
      z-index: -1;
      pointer-events: none;
      opacity: 0;
      transition: opacity 120ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    :host(:hover:not([active]))::before {
      opacity: 1;
    }
  `

  render() {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-list-item': NuxyListItemElement
  }
}
