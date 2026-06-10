import { LitElement, html, css, nothing, customElement, property } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'

@customElement('nuxy-link')
export class NuxyLinkElement extends LitElement {
  static styles = css`
    :host {
      display: contents;
    }

    .nuxy-link {
      color: var(--syntax-operator);
      text-decoration: underline;
      text-decoration-color: transparent;
      text-underline-offset: 2px;
      cursor: pointer;
      transition:
        text-decoration-color 0.15s ease,
        opacity 0.15s ease;
    }
    .nuxy-link:hover {
      text-decoration-color: var(--syntax-operator);
    }
    .nuxy-link--muted {
      color: var(--syntax-comment);
    }
    .nuxy-link--muted:hover {
      color: var(--syntax-variable);
      text-decoration-color: var(--syntax-variable);
    }
  `

  @property({ type: String })
  declare href: string
  @property({ type: String })
  declare variant: string
  @property({ type: Boolean })
  declare external: boolean

  render(): TemplateResult {
    const href = this.href || this.getAttribute('href')
    const variant = this.variant || (this.getAttribute('variant') ?? 'default')
    const external = this.external || this.hasAttribute('external')

    const anchorClass = ['nuxy-link', variant !== 'default' ? `nuxy-link--${variant}` : '']
      .filter(Boolean)
      .join(' ')

    return html`
      <a
        class=${anchorClass}
        href=${href || nothing}
        target=${external ? '_blank' : nothing}
        rel=${external ? 'noopener noreferrer' : nothing}
      >
        <slot></slot>
      </a>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-link': NuxyLinkElement
  }
}
