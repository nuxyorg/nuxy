import { LitElement, html, css, customElement, property } from '@nuxyorg/core'
import type { TemplateResult } from '@nuxyorg/core'

@customElement('nuxy-truncate')
export class NuxyTruncateElement extends LitElement {
  static styles = css`
    :host {
      display: block;
      overflow: hidden;
      min-width: 0;
    }

    .t {
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host([active]) .t {
      display: inline-block;
      overflow: visible;
      text-overflow: clip;
      animation: slide var(--_dur, 6s) ease-in-out infinite;
    }

    @keyframes slide {
      0%,
      15% {
        transform: translateX(0);
      }
      70%,
      85% {
        transform: translateX(var(--_offset, 0px));
      }
      100% {
        transform: translateX(0);
      }
    }
  `

  @property({ type: Boolean, reflect: true })
  declare active: boolean

  protected updated(): void {
    if (!this.active) return
    const t = this.shadowRoot?.querySelector<HTMLElement>('.t')
    if (!t) return
    const overflow = t.offsetWidth - this.offsetWidth
    if (overflow > 0) {
      this.style.setProperty('--_offset', `-${overflow}px`)
      this.style.setProperty('--_dur', `${Math.max(2, Math.round(overflow / 50))}s`)
    } else {
      this.style.removeProperty('--_offset')
      this.style.removeProperty('--_dur')
    }
  }

  render(): TemplateResult {
    return html`<span class="t"><slot></slot></span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-truncate': NuxyTruncateElement
  }
}
