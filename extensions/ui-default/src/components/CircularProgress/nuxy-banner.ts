import { LitElement, html, css, nothing, customElement, property, unsafeHTML } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'

const CLOSE_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`

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

  @property({ type: String, reflect: true }) variant = 'info'
  @property({ type: Boolean }) dismissible = false

  private _innerContent = ''

  connectedCallback(): void {
    // Capture banner content before Lit renders
    this._innerContent = this.innerHTML
    super.connectedCallback()
    this.setAttribute('role', 'status')
  }

  private onClose = (): void => {
    this.dispatchEvent(new CustomEvent('nuxy-banner-close', { bubbles: true, composed: true }))
  }

  render(): TemplateResult {
    return html`
      <div class="nuxy-banner__content">${unsafeHTML(this._innerContent)}</div>
      ${this.dismissible
        ? html`<button
            type="button"
            class="nuxy-banner__close"
            aria-label="Dismiss banner"
            @click=${this.onClose}
          >
            ${unsafeHTML(CLOSE_SVG)}
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
