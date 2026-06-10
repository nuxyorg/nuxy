import { LitElement, html, css, customElement, property, state } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'

const MIRROR_ATTRS = ['disabled', 'type', 'aria-label', 'aria-disabled', 'tabindex', 'title']

@customElement('nuxy-icon-button')
export class NuxyIconButtonElement extends LitElement {
  static styles = css`
    :host {
      display: contents;
    }

    .nuxy-icon-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      color: var(--syntax-variable);
      cursor: pointer;
      padding: 0;
      transition:
        background 0.15s ease,
        color 0.15s ease,
        border-color 0.15s ease;
      flex-shrink: 0;
      outline: none;
    }

    .nuxy-icon-button--sm {
      width: 24px;
      height: 24px;
    }
    .nuxy-icon-button--md {
      width: 32px;
      height: 32px;
    }
    .nuxy-icon-button--lg {
      width: 40px;
      height: 40px;
    }

    .nuxy-icon-button:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.07);
    }

    .nuxy-icon-button:active:not(:disabled) {
      background: rgba(255, 255, 255, 0.12);
    }

    .nuxy-icon-button--ghost:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.05);
      color: var(--syntax-operator);
    }

    .nuxy-icon-button--danger:hover:not(:disabled) {
      background: rgba(255, 29, 100, 0.1);
      color: var(--syntax-invalid);
    }

    .nuxy-icon-button:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .nuxy-icon-button:focus-visible {
      border-color: var(--syntax-operator);
    }
  `

  @property({ type: String })
  declare size: string
  @property({ type: String })
  declare variant: string

  @state()
  declare private _contentHTML: string

  connectedCallback(): void {
    // Capture initial slot content before Lit replaces it
    this._contentHTML = this.innerHTML
    super.connectedCallback()
  }

  render(): TemplateResult {
    const { size, variant } = this
    const className = [
      'nuxy-icon-button',
      `nuxy-icon-button--${size}`,
      variant !== 'default' ? `nuxy-icon-button--${variant}` : '',
    ]
      .filter(Boolean)
      .join(' ')

    const mirroredAttrs: Record<string, string> = {}
    for (const attr of MIRROR_ATTRS) {
      if (this.hasAttribute(attr)) mirroredAttrs[attr] = this.getAttribute(attr) ?? ''
    }

    return html`
      <button
        class=${className}
        ?disabled=${this.hasAttribute('disabled')}
        type=${mirroredAttrs['type'] ?? 'button'}
        aria-label=${mirroredAttrs['aria-label'] ?? ''}
        .innerHTML=${this._contentHTML}
      ></button>
    `
  }
}
