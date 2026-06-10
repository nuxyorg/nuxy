import { LitElement, html, css, customElement, property, unsafeHTML } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'

function svg(content: string): string {
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'>${content}</svg>`
}

const KEY_ICONS: Record<string, string> = {
  '↑': svg("<line x1='12' y1='19' x2='12' y2='5'/><polyline points='5 12 12 5 19 12'/>"),
  '↓': svg("<line x1='12' y1='5' x2='12' y2='19'/><polyline points='19 12 12 19 5 12'/>"),
  '←': svg("<line x1='19' y1='12' x2='5' y2='12'/><polyline points='12 19 5 12 12 5'/>"),
  '→': svg("<line x1='5' y1='12' x2='19' y2='12'/><polyline points='12 5 19 12 12 19'/>"),
  '↵': svg("<polyline points='9 10 4 15 9 20'/><path d='M20 4v7a4 4 0 0 1-4 4H4'/>"),
  '⏎': svg("<polyline points='9 10 4 15 9 20'/><path d='M20 4v7a4 4 0 0 1-4 4H4'/>"),
  '⇧': svg("<path d='M12 2L2 14h7v8h6v-8h7L12 2z'/>"),
  '⌃': svg("<polyline points='4 16 12 8 20 16'/>"),
  '⌘': svg(
    "<path d='M9 9H6a3 3 0 1 1 3-3v3zm0 0h6m-6 0v6m6-6H15a3 3 0 1 0-3 3h3zm0 0v6M9 15H6a3 3 0 1 0 3 3v-3zm0 0h6m0-6v6m0 0h3a3 3 0 1 1-3 3v-3z'/>"
  ),
  '⌥': svg("<path d='M3 7h6l6 10h6'/><line x1='15' y1='7' x2='21' y2='7'/>"),
  '⌫': svg(
    "<path d='M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z'/><line x1='18' y1='9' x2='12' y2='15'/><line x1='12' y1='9' x2='18' y2='15'/>"
  ),
  '⎋': svg(
    "<polyline points='15 18 9 12 15 6'/><line x1='9' y1='12' x2='21' y2='12'/><line x1='3' y1='5' x2='3' y2='19'/>"
  ),
  '⇥': svg(
    "<line x1='3' y1='12' x2='19' y2='12'/><polyline points='12 5 19 12 12 19'/><line x1='21' y1='5' x2='21' y2='19'/>"
  ),
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

    .nuxy-kbd-icon svg {
      width: 0.9em;
      height: 0.9em;
    }
  `

  @property({ type: String }) keys = ''

  render(): TemplateResult {
    return html`${[...this.keys].map((ch) => {
      const icon = KEY_ICONS[ch]
      if (icon) {
        return html`<span class="nuxy-kbd-icon">${unsafeHTML(icon)}</span>`
      }
      return html`${ch}`
    })}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-kbd': NuxyKbdElement
  }
}
