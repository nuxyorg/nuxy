import { LitElement, html, css, customElement, property, unsafeHTML } from '@nuxy/core'
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

  @property({ type: String }) as = 'p'
  @property({ type: String }) size = 'md'
  @property({ type: String }) variant = 'default'
  @property({ type: Boolean }) bold = false
  @property({ type: Boolean }) mono = false

  private _innerContent = ''

  connectedCallback(): void {
    // Capture children before Lit renders
    this._innerContent = this.innerHTML
    super.connectedCallback()
  }

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

    return html`${unsafeHTML(`<${tag} class="${className}">${this._innerContent}</${tag}>`)}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-text': NuxyTextElement
  }
}
