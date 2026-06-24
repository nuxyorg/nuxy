import { LitElement, html, css, customElement, property } from '@nuxyorg/core'
import type { TemplateResult } from '@nuxyorg/core'

@customElement('nuxy-shimmer-text')
export class NuxyShimmerTextElement extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
      max-width: 100%;
    }

    .nuxy-shimmer-text {
      display: inline-block;
      max-width: 100%;
      background: linear-gradient(
        90deg,
        var(--nuxy-shimmer-base, var(--syntax-keyword)) 0%,
        var(--nuxy-shimmer-base, var(--syntax-keyword)) 35%,
        var(--nuxy-shimmer-highlight, rgba(255, 255, 255, 0.85)) 50%,
        var(--nuxy-shimmer-base, var(--syntax-keyword)) 65%,
        var(--nuxy-shimmer-base, var(--syntax-keyword)) 100%
      );
      background-size: 200% 100%;
      background-clip: text;
      -webkit-background-clip: text;
      color: transparent;
      animation: nuxy-shimmer-text 1.6s ease infinite;
    }

    .nuxy-shimmer-text--xs {
      font-size: var(--font-xs);
    }

    .nuxy-shimmer-text--sm {
      font-size: var(--font-sm);
    }

    .nuxy-shimmer-text--md {
      font-size: var(--font-md);
    }

    @keyframes nuxy-shimmer-text {
      0% {
        background-position: 100% 0;
      }
      100% {
        background-position: -100% 0;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .nuxy-shimmer-text {
        animation: none;
        color: var(--syntax-keyword);
        background: none;
      }
    }
  `

  @property({ type: String })
  declare size: string

  @property({ type: String })
  declare text: string

  connectedCallback(): void {
    super.connectedCallback()
    if (!this.hasAttribute('role')) this.setAttribute('role', 'status')
  }

  updated(): void {
    const label = this.text?.trim() || this.textContent?.trim() || 'Loading'
    this.setAttribute('aria-label', label)
  }

  render(): TemplateResult {
    const size = this.size || 'xs'
    const className = `nuxy-shimmer-text nuxy-shimmer-text--${size}`

    return html`<span class=${className}>${this.text ? this.text : html`<slot></slot>`}</span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-shimmer-text': NuxyShimmerTextElement
  }
}
