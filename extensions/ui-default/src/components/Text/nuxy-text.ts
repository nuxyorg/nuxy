import { LitElement, html, css, customElement, property } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'

const ALLOWED_TAGS = new Set(['p', 'span', 'div', 'label', 'small', 'strong', 'em'])

@customElement('nuxy-text')
export class NuxyTextElement extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .nuxy-text {
      margin: 0;
    }
    .nuxy-text--xs {
      font-size: var(--font-xs);
    }
    .nuxy-text--sm {
      font-size: var(--font-sm);
    }
    .nuxy-text--md {
      font-size: var(--font-md);
    }
    .nuxy-text--lg {
      font-size: var(--font-lg);
    }
    .nuxy-text--xl {
      font-size: var(--font-xl);
    }
    .nuxy-text--muted {
      color: var(--syntax-comment);
    }
    .nuxy-text--accent {
      color: var(--syntax-operator);
    }
    .nuxy-text--danger {
      color: var(--syntax-invalid);
    }
    .nuxy-text--success {
      color: var(--syntax-green);
    }
    .nuxy-text--bold {
      font-weight: 600;
    }
    .nuxy-text--mono {
      font-family: monospace;
    }
  `

  @property({ type: String })
  declare as: string
  @property({ type: String })
  declare size: string
  @property({ type: String })
  declare variant: string
  @property({ type: Boolean })
  declare bold: boolean
  @property({ type: Boolean })
  declare mono: boolean

  render(): TemplateResult {
    const tag = ALLOWED_TAGS.has(this.as) ? this.as : 'p'
    const className = [
      'nuxy-text',
      `nuxy-text--${this.size}`,
      this.variant !== 'default' ? `nuxy-text--${this.variant}` : '',
      this.bold ? 'nuxy-text--bold' : '',
      this.mono ? 'nuxy-text--mono' : '',
    ]
      .filter(Boolean)
      .join(' ')

    switch (tag) {
      case 'span':
        return html`<span class="${className}"><slot></slot></span>`
      case 'div':
        return html`<div class="${className}"><slot></slot></div>`
      case 'label':
        return html`<label class="${className}"><slot></slot></label>`
      case 'small':
        return html`<small class="${className}"><slot></slot></small>`
      case 'strong':
        return html`<strong class="${className}"><slot></slot></strong>`
      case 'em':
        return html`<em class="${className}"><slot></slot></em>`
      default:
        return html`<p class="${className}"><slot></slot></p>`
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-text': NuxyTextElement
  }
}
