import { LitElement, html, css, customElement } from '@nuxyorg/core'
import type { TemplateResult } from '@nuxyorg/core'

@customElement('nuxy-conversion-card')
export class NuxyConversionCardElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      width: 100%;
    }

    .nuxy-conversion-card__label {
      font-size: var(--font-xs);
      font-weight: 600;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--text-muted, rgba(255, 255, 255, 0.4));
    }

    .nuxy-conversion-card__body {
      display: flex;
      align-items: center;
      border-radius: var(--radius-xl);
      overflow: hidden;
      background: var(--surface-overlay, rgba(20, 20, 20, 0.65));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      position: relative;
      min-height: calc(var(--space-6) * 2);
    }

    .nuxy-conversion-card__panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-4) var(--space-5);
    }

    .nuxy-conversion-card__panel--from {
      border-right: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .nuxy-conversion-card__arrow {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      color: var(--text-muted, rgba(255, 255, 255, 0.3));
      font-size: var(--font-lg);
      pointer-events: none;
      z-index: 1;
    }
  `

  render(): TemplateResult {
    return html`
      <div class="nuxy-conversion-card__label"><slot name="label"></slot></div>
      <div class="nuxy-conversion-card__body">
        <div class="nuxy-conversion-card__panel nuxy-conversion-card__panel--from">
          <slot name="from"></slot>
        </div>
        <div class="nuxy-conversion-card__arrow">→</div>
        <div class="nuxy-conversion-card__panel nuxy-conversion-card__panel--to">
          <slot name="to"></slot>
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-conversion-card': NuxyConversionCardElement
  }
}
