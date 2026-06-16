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

  private _renderKey(ch: string): TemplateResult {
    const iconName = KEY_ICON_NAMES[ch]
    if (iconName) {
      return html`<span class="nuxy-kbd-icon"
        ><nuxy-icon name=${iconName} size="0.9em" opacity="1" stroke-width="2.5"></nuxy-icon
      ></span>`
    }
    return html`${ch}`
  }

  render(): TemplateResult {
    const keys = this.keys
    const wholeIconName = KEY_ICON_NAMES[keys]
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
