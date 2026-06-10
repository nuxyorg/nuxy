import { LitElement, html, css, nothing, customElement, property, unsafeHTML } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'

const ERROR_ICON = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`

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

  @property({ type: String }) title = 'Something went wrong'
  @property({ type: String }) message = ''
  @property({ type: String, attribute: 'retry-label' }) retryLabel: string | null = null

  connectedCallback(): void {
    super.connectedCallback()
    this.setAttribute('role', 'alert')
  }

  private onRetry = (): void => {
    this.dispatchEvent(new CustomEvent('nuxy-error-state-retry', { bubbles: true, composed: true }))
  }

  render(): TemplateResult {
    return html`
      <span class="nuxy-error-state__icon" aria-hidden="true">${unsafeHTML(ERROR_ICON)}</span>
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
