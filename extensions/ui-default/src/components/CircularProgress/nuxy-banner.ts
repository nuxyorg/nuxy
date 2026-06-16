import { LitElement, html, css, nothing, customElement, property } from '@nuxyorg/core'
import type { TemplateResult } from '@nuxyorg/core'

@customElement('nuxy-banner')
export class NuxyBannerElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-3) var(--space-5);
      background: var(--syntax-keyword);
      color: var(--syntax-variable);
      font-size: var(--font-sm);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    :host([variant='info']) {
      background: rgba(42, 192, 255, 0.15);
      color: var(--syntax-operator);
    }
    :host([variant='warning']) {
      background: rgba(255, 170, 1, 0.12);
      color: var(--syntax-constant);
    }
    :host([variant='error']) {
      background: rgba(255, 29, 100, 0.12);
      color: var(--syntax-invalid);
    }
    :host([variant='success']) {
      background: rgba(204, 255, 45, 0.1);
      color: var(--syntax-green);
    }

    .nuxy-banner__content {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      flex: 1;
    }

    .nuxy-banner__close {
      background: transparent;
      border: none;
      color: inherit;
      cursor: pointer;
      padding: 0;
      display: flex;
      opacity: 0.7;
      transition: opacity 0.1s ease;
    }

    .nuxy-banner__close:hover {
      opacity: 1;
    }
  `

  @property({ type: String, reflect: true })
  declare variant: string
  @property({ type: Boolean })
  declare dismissible: boolean

  connectedCallback(): void {
    super.connectedCallback()
    this.setAttribute('role', 'status')
  }

  private onClose = (): void => {
    this.dispatchEvent(new CustomEvent('nuxy-banner-close', { bubbles: true, composed: true }))
  }

  render(): TemplateResult {
    return html`
      <div class="nuxy-banner__content"><slot></slot></div>
      ${this.dismissible
        ? html`<button
            type="button"
            class="nuxy-banner__close"
            aria-label="Dismiss banner"
            @click=${this.onClose}
          >
            <nuxy-icon name="Close" size="16" opacity="1"></nuxy-icon>
          </button>`
        : nothing}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-banner': NuxyBannerElement
  }
}
