import { LitElement, html, css, customElement, property } from '@nuxyorg/core'
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
    }

    .nuxy-kbd-icon {
      display: inline-flex;
      align-items: center;
      line-height: 0;
    }
  `

  @property({ type: String, attribute: 'keys' })
  declare keys: string

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

  render(): TemplateResult {
    const keys = this.keys
    const isMacScheme = document.documentElement.getAttribute('data-kbd-scheme') === 'mac'

    if (
      isMacScheme &&
      (keys.toLowerCase() === 'ctrl' || keys.toLowerCase() === 'control' || keys === '⌃')
    ) {
      return html`<span class="nuxy-kbd-icon"
        ><nuxy-icon name="kbd-cmd" size="0.9em" opacity="1"></nuxy-icon
      ></span>`
    }

    const wholeIconName = this._getIconName(keys)
    if (wholeIconName) {
      return html`<span class="nuxy-kbd-icon"
        ><nuxy-icon name=${wholeIconName} size="0.9em" opacity="1"></nuxy-icon
      ></span>`
    }

    return html`${repeat(
      [...keys],
      (_ch, index) => `${keys}:${index}`,
      (ch) => this._renderKey(ch)
    )}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-kbd': NuxyKbdElement
  }
}
