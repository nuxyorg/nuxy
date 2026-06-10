import { LitElement, html, css, nothing, customElement, property } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'
import '../CopyButton/nuxy-copy-button.ts'
import { highlight } from './highlight'

@customElement('nuxy-code-block')
export class NuxyCodeBlockElement extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: relative;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .nuxy-code-block__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-2) var(--space-4);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(255, 255, 255, 0.02);
    }

    .nuxy-code-block__lang {
      font-size: var(--font-xs);
      color: var(--syntax-comment);
      font-family: monospace;
      text-transform: lowercase;
    }

    .nuxy-code-block__copy {
      flex-shrink: 0;
    }

    .nuxy-code-block__pre {
      margin: 0;
      padding: var(--space-4);
      overflow-x: auto;
      font-family: monospace;
      font-size: var(--font-sm);
      line-height: 1.6;
      color: var(--syntax-variable);
      white-space: pre;
      scrollbar-width: thin;
      scrollbar-color: var(--scrollbar-thumb) transparent;
    }

    /* Syntax highlight token colors */
    .nuxy-hl-keyword {
      color: var(--syntax-keyword, #c792ea);
    }
    .nuxy-hl-string {
      color: var(--syntax-string, #c3e88d);
    }
    .nuxy-hl-comment {
      color: var(--syntax-comment, #546e7a);
      font-style: italic;
    }
    .nuxy-hl-number {
      color: var(--syntax-number, #f78c6c);
    }
    .nuxy-hl-operator {
      color: var(--syntax-operator, #89ddff);
    }
  `

  @property({ type: String })
  declare code: string
  @property({ type: String })
  declare language: string
  @property({ attribute: 'show-copy', type: String })
  declare showCopy: string

  private renderTokens(): TemplateResult | string {
    const code = (this.code || this.getAttribute('code')) ?? ''
    const language = ((this.language || this.getAttribute('language')) ?? 'text').toLowerCase()
    const shouldHighlight = language !== 'text' && language !== 'plain' && language !== ''
    const tokens = shouldHighlight ? highlight(code, language) : null

    if (!tokens) return code

    return html`${tokens.map((tok) =>
      tok.type === 'plain'
        ? tok.text
        : html`<span class=${`nuxy-hl-${tok.type}`}>${tok.text}</span>`
    )}`
  }

  render(): TemplateResult {
    const code = (this.code || this.getAttribute('code')) ?? ''
    const language = (this.language || this.getAttribute('language')) ?? 'text'
    const showCopy = this.getAttribute('show-copy') !== 'false'

    return html`
      ${language || showCopy
        ? html`
            <div class="nuxy-code-block__header">
              <span class="nuxy-code-block__lang">${language}</span>
              ${showCopy
                ? html`
                    <nuxy-copy-button
                      class="nuxy-code-block__copy"
                      value=${code}
                      label="Copy code"
                    ></nuxy-copy-button>
                  `
                : nothing}
            </div>
          `
        : nothing}
      <pre class="nuxy-code-block__pre"><code>${this.renderTokens()}</code></pre>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-code-block': NuxyCodeBlockElement
  }
}
