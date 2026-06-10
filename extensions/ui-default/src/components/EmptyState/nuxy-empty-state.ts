import { LitElement, html, css, nothing, customElement, property } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'

@customElement('nuxy-empty-state')
export class NuxyEmptyStateElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-6) 0;
      text-align: center;
    }

    :host([page]) {
      padding: var(--space-6) var(--space-5);
      max-width: 420px;
      color: var(--syntax-variable);
    }

    .nuxy-empty-state__title {
      font-size: var(--font-lg);
      margin: 0 0 var(--space-3);
      font-weight: 600;
      color: var(--syntax-variable);
    }

    .nuxy-empty-state__message {
      font-size: var(--font-md);
      color: var(--syntax-keyword);
      font-weight: 500;
      margin: 0 0 var(--space-3);
    }

    :host([page]) .nuxy-empty-state__message {
      font-size: var(--font-sm);
      font-weight: 400;
    }

    .nuxy-empty-state__hint {
      font-size: var(--font-sm);
      color: var(--syntax-keyword);
      opacity: 0.6;
      margin: 0;
    }

    .nuxy-empty-state__error {
      font-size: var(--font-xs);
      color: var(--syntax-invalid);
      margin: 0;
    }
  `

  @property({ type: String }) title = ''
  @property({ type: String }) message = ''
  @property({ type: String }) hint = ''
  @property({ type: String }) error = ''
  @property({ type: Boolean, reflect: true }) page = false

  render(): TemplateResult {
    return html`
      ${this.title ? html`<h2 class="nuxy-empty-state__title">${this.title}</h2>` : nothing}
      ${this.message ? html`<p class="nuxy-empty-state__message">${this.message}</p>` : nothing}
      ${this.hint ? html`<p class="nuxy-empty-state__hint">${this.hint}</p>` : nothing}
      ${this.error ? html`<p class="nuxy-empty-state__error">${this.error}</p>` : nothing}
      <slot></slot>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-empty-state': NuxyEmptyStateElement
  }
}
