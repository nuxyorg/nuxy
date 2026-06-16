import { LitElement, html, css, customElement, property } from '@nuxyorg/core'
import type { TemplateResult } from '@nuxyorg/core'

const SIZES: Record<string, number> = { sm: 16, md: 24, lg: 36 }

function resolveSize(raw: string): number {
  if (raw in SIZES) return SIZES[raw]!
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : SIZES.md
}

@customElement('nuxy-spinner')
export class NuxySpinnerElement extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      animation: nuxy-spin-fade-in 180ms ease both;
      animation-delay: 150ms;
    }

    @keyframes nuxy-spin-fade-in {
      from {
        opacity: 0;
        scale: 0.7;
      }
      to {
        opacity: 1;
        scale: 1;
      }
    }

    .nuxy-spinner__svg {
      animation: nuxy-spin 0.75s linear infinite;
    }

    @keyframes nuxy-spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    .nuxy-spinner__circle {
      stroke: var(--syntax-operator);
      stroke-linecap: round;
      stroke-dasharray: 50;
      stroke-dashoffset: 15;
    }
  `

  @property({ type: String })
  declare size: string

  connectedCallback(): void {
    super.connectedCallback()
    if (!this.hasAttribute('role')) this.setAttribute('role', 'status')
    if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', 'Loading…')
  }

  render(): TemplateResult {
    const px = resolveSize(this.size)
    const r = (px / 2) * 0.7
    const circumference = 2 * Math.PI * r
    const strokeWidth = px * 0.1

    return html`
      <svg
        class="nuxy-spinner__svg"
        width=${px}
        height=${px}
        viewBox="0 0 ${px} ${px}"
        fill="none"
        aria-hidden="true"
      >
        <circle
          class="nuxy-spinner__circle"
          cx=${px / 2}
          cy=${px / 2}
          r=${r}
          stroke-width=${strokeWidth}
          stroke-dasharray=${circumference}
          stroke-dashoffset=${circumference * 0.25}
        />
      </svg>
    `
  }
}

export function registerNuxySpinner(): void {
  // registration handled by @customElement decorator
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-spinner': NuxySpinnerElement
  }
}
