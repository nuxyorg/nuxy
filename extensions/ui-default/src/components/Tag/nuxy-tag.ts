import { LitElement, html, css, nothing, customElement, property, unsafeHTML } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'

const REMOVE_SVG = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`

@customElement('nuxy-tag')
export class NuxyTagElement extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: 2px var(--space-3);
      border-radius: var(--radius-xl);
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--syntax-variable);
      font-size: var(--font-sm);
      line-height: 1.4;
      white-space: nowrap;
      max-width: 200px;
    }

    :host([removable]) {
      padding-right: var(--space-2);
    }

    .nuxy-tag__remove {
      background: transparent;
      border: none;
      padding: 0;
      margin: 0;
      color: var(--syntax-comment);
      cursor: pointer;
      display: flex;
      align-items: center;
      transition: color 0.15s ease;
      flex-shrink: 0;
    }

    .nuxy-tag__remove:hover {
      color: var(--syntax-variable);
    }

    .nuxy-tag__label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Color variants */
    :host([variant='blue']) {
      background: rgba(42, 192, 255, 0.12);
      border-color: rgba(42, 192, 255, 0.25);
      color: var(--syntax-operator);
    }
    :host([variant='green']) {
      background: rgba(204, 255, 45, 0.1);
      border-color: rgba(204, 255, 45, 0.2);
      color: var(--syntax-green);
    }
    :host([variant='orange']) {
      background: rgba(249, 103, 43, 0.1);
      border-color: rgba(249, 103, 43, 0.2);
      color: var(--syntax-orange);
    }
    :host([variant='red']) {
      background: rgba(255, 29, 100, 0.1);
      border-color: rgba(255, 29, 100, 0.2);
      color: var(--syntax-invalid);
    }
  `

  @property({ type: String, reflect: true }) variant = 'default'
  @property({ type: Boolean, reflect: true }) removable = false

  private _innerContent = ''

  connectedCallback(): void {
    // Capture label content before Lit renders
    this._innerContent = this.innerHTML
    super.connectedCallback()
  }

  private onRemoveClick = (): void => {
    this.dispatchEvent(new CustomEvent('nuxy-tag-remove', { bubbles: true, composed: true }))
  }

  render(): TemplateResult {
    return html`
      <span class="nuxy-tag__label">${unsafeHTML(this._innerContent)}</span>
      ${this.removable
        ? html`<button
            type="button"
            class="nuxy-tag__remove"
            aria-label="Remove"
            @click=${this.onRemoveClick}
          >
            ${unsafeHTML(REMOVE_SVG)}
          </button>`
        : nothing}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-tag': NuxyTagElement
  }
}
