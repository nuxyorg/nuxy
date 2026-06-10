import { LitElement, html, css, nothing, customElement, property, state } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'

const PLACEMENTS = new Set(['top', 'bottom', 'left', 'right'])

@customElement('nuxy-tooltip')
export class NuxyTooltipElement extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
    }

    .nuxy-tooltip-wrapper {
      position: relative;
      display: inline-flex;
      align-items: center;
    }

    .nuxy-tooltip {
      position: absolute;
      z-index: var(--z-popover);
      background: var(--syntax-keyword);
      color: var(--syntax-variable);
      font-size: var(--font-sm);
      padding: var(--space-1) var(--space-3);
      border-radius: var(--radius-md);
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease;
      max-width: 220px;
      white-space: normal;
      text-align: center;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .nuxy-tooltip--visible {
      opacity: 1;
    }

    /* Placement */
    .nuxy-tooltip--top {
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
    }

    .nuxy-tooltip--bottom {
      top: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
    }

    .nuxy-tooltip--left {
      right: calc(100% + 6px);
      top: 50%;
      transform: translateY(-50%);
    }

    .nuxy-tooltip--right {
      left: calc(100% + 6px);
      top: 50%;
      transform: translateY(-50%);
    }
  `

  @property({ type: String })
  declare content: string
  @property({ type: String })
  declare placement: string

  @state()
  declare private _visible: boolean
  @state()
  declare private _triggerHTML: string

  connectedCallback(): void {
    // Capture trigger children before Lit replaces them
    this._triggerHTML = this.innerHTML
    super.connectedCallback()
  }

  private show = (): void => {
    this._visible = true
  }

  private hide = (): void => {
    this._visible = false
  }

  render(): TemplateResult {
    const placement = PLACEMENTS.has(this.placement) ? this.placement : 'top'

    return html`
      <span
        class="nuxy-tooltip-wrapper"
        @mouseenter=${this.show}
        @mouseleave=${this.hide}
        @focusin=${this.show}
        @focusout=${this.hide}
      >
        <span .innerHTML=${this._triggerHTML}></span>
        <span
          role="tooltip"
          class="nuxy-tooltip nuxy-tooltip--${placement} ${this._visible
            ? 'nuxy-tooltip--visible'
            : ''}"
          >${this.content}</span
        >
      </span>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-tooltip': NuxyTooltipElement
  }
}
