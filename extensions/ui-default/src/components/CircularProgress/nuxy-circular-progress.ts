import { LitElement, html, css, nothing, customElement, property } from '@nuxyorg/core'
import type { TemplateResult } from '@nuxyorg/core'

@customElement('nuxy-circular-progress')
export class NuxyCircularProgressElement extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      position: relative;
      align-items: center;
      justify-content: center;
    }

    .nuxy-circular-progress__svg {
      transform: rotate(-90deg);
    }

    .nuxy-circular-progress__track {
      stroke: rgba(255, 255, 255, 0.08);
    }

    .nuxy-circular-progress__fill {
      stroke: var(--syntax-operator);
      stroke-linecap: round;
      transition: stroke-dashoffset 0.3s ease;
    }

    .nuxy-circular-progress__fill--indeterminate {
      animation: nuxy-circular-rotate 1.4s linear infinite;
      stroke-dasharray: 80, 200;
      stroke-dashoffset: 0;
    }

    @keyframes nuxy-circular-rotate {
      100% {
        transform: rotate(360deg);
      }
    }

    .nuxy-circular-progress__label {
      position: absolute;
      font-size: var(--font-xs);
      font-weight: 600;
      color: var(--syntax-variable);
      font-variant-numeric: tabular-nums;
    }
  `

  @property({ type: String })
  declare value: string
  @property({ type: String })
  declare size: string
  @property({ type: String, attribute: 'stroke-width' })
  declare strokeWidth: string
  @property({ type: Boolean, attribute: 'show-label' })
  declare showLabel: boolean

  connectedCallback(): void {
    super.connectedCallback()
    this.setAttribute('role', 'progressbar')
  }

  updated(): void {
    const valueNum = this.value !== '' ? Number(this.value) : undefined
    const indeterminate = valueNum === undefined || Number.isNaN(valueNum)
    const size = Number(this.size) || 40

    this.style.width = `${size}px`
    this.style.height = `${size}px`

    if (!indeterminate && valueNum !== undefined) {
      this.setAttribute('aria-valuenow', String(valueNum))
      this.setAttribute('aria-valuemin', '0')
      this.setAttribute('aria-valuemax', '100')
    } else {
      this.removeAttribute('aria-valuenow')
      this.removeAttribute('aria-valuemin')
      this.removeAttribute('aria-valuemax')
    }
  }

  render(): TemplateResult {
    const valueNum = this.value !== '' ? Number(this.value) : undefined
    const indeterminate = valueNum === undefined || Number.isNaN(valueNum)
    const size = Number(this.size) || 40
    const strokeW = Number(this.strokeWidth) || 4

    const r = (size - strokeW) / 2
    const circumference = 2 * Math.PI * r
    const offset = indeterminate ? 0 : circumference - ((valueNum ?? 0) / 100) * circumference

    const fillClass = `nuxy-circular-progress__fill${indeterminate ? ' nuxy-circular-progress__fill--indeterminate' : ''}`

    return html`
      <svg
        class="nuxy-circular-progress__svg"
        width=${size}
        height=${size}
        viewBox="0 0 ${size} ${size}"
      >
        <circle
          class="nuxy-circular-progress__track"
          cx=${size / 2}
          cy=${size / 2}
          r=${r}
          stroke-width=${strokeW}
          fill="none"
        />
        <circle
          class=${fillClass}
          cx=${size / 2}
          cy=${size / 2}
          r=${r}
          stroke-width=${strokeW}
          stroke-dasharray=${circumference}
          stroke-dashoffset=${offset}
          fill="none"
        />
      </svg>
      ${this.showLabel && !indeterminate && valueNum !== undefined
        ? html`<span class="nuxy-circular-progress__label">${Math.round(valueNum)}%</span>`
        : nothing}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-circular-progress': NuxyCircularProgressElement
  }
}
