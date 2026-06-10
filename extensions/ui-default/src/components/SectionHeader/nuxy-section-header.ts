import { LitElement, html, css, nothing, customElement, property } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'

@customElement('nuxy-section-header')
export class NuxySectionHeaderElement extends LitElement {
  static styles = css`
    :host {
      padding: 8px 12px 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .nuxy-section-header__action {
      margin-left: auto;
      display: flex;
      align-items: center;
    }

    ::slotted([slot='action']) {
      margin-left: auto;
    }

    .nuxy-section-header__label {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted, rgba(255, 255, 255, 0.4));
    }

    .nuxy-section-header__desc {
      font-size: 0.75rem;
      color: var(--text-muted, rgba(255, 255, 255, 0.3));
    }
  `

  @property({ type: String })
  declare label: string
  @property({ type: String })
  declare description: string

  render(): TemplateResult {
    return html`
      <span class="nuxy-section-header__label">${this.label}</span>
      ${this.description
        ? html`<span class="nuxy-section-header__desc">${this.description}</span>`
        : nothing}
      <span class="nuxy-section-header__action"><slot name="action"></slot></span>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-section-header': NuxySectionHeaderElement
  }
}
