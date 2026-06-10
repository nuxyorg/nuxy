import { LitElement, html, css, nothing, customElement, property } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'

@customElement('nuxy-error-state')
export class NuxyErrorStateElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: var(--space-6) var(--space-5);
      gap: var(--space-3);
      border: 1px dashed rgba(255, 29, 100, 0.2);
      border-radius: var(--radius-xl);
      background: rgba(255, 29, 100, 0.02);
      max-width: 400px;
      margin: 0 auto;
    }

    .nuxy-error-state__icon {
      color: var(--syntax-invalid);
    }

    .nuxy-error-state__title {
      font-size: var(--font-lg);
      font-weight: 600;
      color: var(--syntax-variable);
      margin: 0;
    }

    .nuxy-error-state__message {
      font-size: var(--font-sm);
      color: var(--syntax-comment);
      margin: 0;
      line-height: 1.5;
    }

    .nuxy-error-state__retry {
      padding: var(--space-2) var(--space-4);
      border-radius: var(--radius-lg);
      font-size: var(--font-sm);
      font-weight: 600;
      border: 1px solid var(--syntax-comment);
      transition:
        background-color 200ms,
        border-color 200ms,
        color 200ms,
        transform 200ms;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      cursor: pointer;
      background-color: var(--syntax-comment);
      color: var(--syntax-variable);
    }

    .nuxy-error-state__retry:hover {
      background-color: var(--syntax-keyword);
      border-color: var(--syntax-keyword);
    }
  `

  @property({ type: String })
  declare title: string
  @property({ type: String })
  declare message: string
  @property({ type: String, attribute: 'retry-label' })
  declare retryLabel: string | null

  connectedCallback(): void {
    super.connectedCallback()
    this.setAttribute('role', 'alert')
  }

  private onRetry = (): void => {
    this.dispatchEvent(new CustomEvent('nuxy-error-state-retry', { bubbles: true, composed: true }))
  }

  render(): TemplateResult {
    return html`
      <span class="nuxy-error-state__icon" aria-hidden="true"><nuxy-icon name="AlertCircle" size="32" opacity="1"></nuxy-icon></span>
      <h3 class="nuxy-error-state__title">${this.title}</h3>
      <p class="nuxy-error-state__message">${this.message}</p>
      ${this.retryLabel !== null
        ? html`<button type="button" class="nuxy-error-state__retry" @click=${this.onRetry}>
            ${this.retryLabel}
          </button>`
        : nothing}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-error-state': NuxyErrorStateElement
  }
}
