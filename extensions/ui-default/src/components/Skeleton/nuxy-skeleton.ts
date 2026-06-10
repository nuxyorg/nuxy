import { LitElement, html, css, customElement, property } from '@nuxy/core'

@customElement('nuxy-skeleton')
export class NuxySkeletonElement extends LitElement {
  @property({ type: String, reflect: true })
  declare variant: string
  @property({ type: String })
  declare width: string
  @property({ type: String })
  declare height: string

  static styles = css`
    :host {
      border-radius: var(--radius-md);
      background: rgba(255, 255, 255, 0.06);
      overflow: hidden;
      position: relative;
    }

    :host::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.06) 50%,
        transparent 100%
      );
      animation: nuxy-shimmer 1.5s ease infinite;
    }

    @keyframes nuxy-shimmer {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(100%);
      }
    }

    :host([variant='text']) {
      height: var(--font-md);
      border-radius: var(--radius-sm);
    }

    :host([variant='circle']) {
      border-radius: 50%;
    }
  `

  connectedCallback(): void {
    super.connectedCallback()
    if (!this.hasAttribute('aria-hidden')) this.setAttribute('aria-hidden', 'true')
  }

  updated(): void {
    if (this.width) this.style.width = /^\d+$/.test(this.width) ? `${this.width}px` : this.width
    else this.style.removeProperty('width')
    if (this.height)
      this.style.height = /^\d+$/.test(this.height) ? `${this.height}px` : this.height
    else this.style.removeProperty('height')
  }

  render() {
    return html`<slot></slot>`
  }
}
