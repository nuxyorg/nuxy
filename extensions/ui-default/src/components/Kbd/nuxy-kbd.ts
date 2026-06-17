import { LitElement, html, css, nothing, customElement, property } from '@nuxyorg/core'
import type { TemplateResult } from '@nuxyorg/core'
import { repeat } from 'lit/directives/repeat.js'

const KEY_ICON_NAMES: Record<string, string> = {
  '↑': 'arrow-up',
  '↓': 'arrow-down',
  '←': 'arrow-left',
  '→': 'arrow-right',
  '↵': 'kbd-enter',
  '⏎': 'kbd-enter',
  '⇧': 'kbd-shift',
  '⌃': 'kbd-ctrl',
  '⌘': 'kbd-cmd',
  '⌥': 'kbd-option',
  '⌫': 'kbd-backspace',
  '⎋': 'kbd-escape',
  '⇥': 'kbd-tab',
}

@customElement('nuxy-kbd')
export class NuxyKbdElement extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: 1px;
      padding: var(--space-0) var(--space-2);
      border-radius: var(--radius-sm);
      background-color: var(--syntax-comment);
      border: 1px solid var(--syntax-keyword);
      font-size: var(--font-xs);
      color: var(--syntax-variable);
      line-height: 1;
      position: relative;
      isolation: isolate;
    }

    .nuxy-kbd__hold-progress {
      position: absolute;
      inset: -1px;
      width: calc(100% + 2px);
      height: calc(100% + 2px);
      pointer-events: none;
      overflow: visible;
      color: var(--color-accent, var(--syntax-operator));
    }

    .nuxy-kbd__hold-progress-track {
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-dasharray: 100;
      stroke-dashoffset: 100;
      animation: nuxy-kbd-hold-stroke var(--nuxy-hold-ms, 600ms) linear forwards;
    }

    @keyframes nuxy-kbd-hold-stroke {
      to {
        stroke-dashoffset: 0;
      }
    }

    .nuxy-kbd-icon {
      display: inline-flex;
      align-items: center;
      line-height: 0;
    }
  `

  @property({ type: String, attribute: 'keys' })
  declare keys: string

  @property({ type: Number, attribute: 'hold-ms' })
  declare holdMs: number | null

  private _onSchemeUpdated: (() => void) | null = null

  connectedCallback(): void {
    super.connectedCallback()
    this._onSchemeUpdated = () => this.requestUpdate()
    document.addEventListener('nuxy-kbd-scheme-updated', this._onSchemeUpdated)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    if (this._onSchemeUpdated) {
      document.removeEventListener('nuxy-kbd-scheme-updated', this._onSchemeUpdated)
      this._onSchemeUpdated = null
    }
  }

  private _getIconName(key: string): string | undefined {
    if (key === '⌃') {
      const isMacScheme = document.documentElement.getAttribute('data-kbd-scheme') === 'mac'
      return isMacScheme ? 'kbd-cmd' : 'kbd-ctrl'
    }
    return KEY_ICON_NAMES[key]
  }

  private _renderKey(ch: string): TemplateResult {
    const iconName = this._getIconName(ch)
    if (iconName) {
      return html`<span class="nuxy-kbd-icon"
        ><nuxy-icon name=${iconName} size="0.9em" opacity="1" stroke-width="2.5"></nuxy-icon
      ></span>`
    }
    return html`${ch}`
  }

  private _renderHoldProgress(): TemplateResult | typeof nothing {
    if (this.holdMs == null) return nothing
    return html`<svg
      class="nuxy-kbd__hold-progress"
      style="--nuxy-hold-ms:${this.holdMs}ms"
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <rect
        class="nuxy-kbd__hold-progress-track"
        x="2"
        y="2"
        width="96"
        height="96"
        rx="14"
        ry="14"
        pathLength="100"
      />
    </svg>`
  }

  private _wrapContent(content: TemplateResult): TemplateResult {
    return html`${this._renderHoldProgress()}${content}`
  }

  render(): TemplateResult {
    const keys = this.keys
    const isMacScheme = document.documentElement.getAttribute('data-kbd-scheme') === 'mac'

    if (
      isMacScheme &&
      (keys.toLowerCase() === 'ctrl' || keys.toLowerCase() === 'control' || keys === '⌃')
    ) {
      return this._wrapContent(
        html`<span class="nuxy-kbd-icon"
          ><nuxy-icon name="kbd-cmd" size="0.9em" opacity="1"></nuxy-icon
        ></span>`
      )
    }

    const wholeIconName = this._getIconName(keys)
    if (wholeIconName) {
      return this._wrapContent(
        html`<span class="nuxy-kbd-icon"
          ><nuxy-icon name=${wholeIconName} size="0.9em" opacity="1"></nuxy-icon
        ></span>`
      )
    }

    return this._wrapContent(
      html`${repeat(
        [...keys],
        (_ch, index) => `${keys}:${index}`,
        (ch) => this._renderKey(ch)
      )}`
    )
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-kbd': NuxyKbdElement
  }
}
