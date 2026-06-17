import { LitElement, html, css, customElement, property, ref } from '@nuxyorg/core'
import type { TemplateResult } from '@nuxyorg/core'
import { renderMarkdownTo } from './render-markdown'

@customElement('nuxy-markdown-text')
export class NuxyMarkdownTextElement extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-size: var(--font-sm);
      line-height: 1.65;
      color: var(--text-primary);
      word-break: break-word;
      padding-bottom: var(--space-4);
    }

    :host > * + * {
      margin-top: var(--space-4);
    }

    :host > * + .nuxy-md-h1,
    :host > * + .nuxy-md-h2,
    :host > * + .nuxy-md-h3,
    :host > * + .nuxy-md-h4,
    :host > * + .nuxy-md-h5,
    :host > * + .nuxy-md-h6,
    :host > * + .nuxy-md-p,
    :host > * + .nuxy-md-ul,
    :host > * + .nuxy-md-ol,
    :host > * + .nuxy-md-blockquote,
    :host > * + .nuxy-md-hr,
    :host > * + .nuxy-code-block,
    :host > * + .nuxy-table-container {
      margin-top: var(--space-5);
    }

    div > * + * {
      margin-top: var(--space-4);
    }

    div > * + .nuxy-md-h1,
    div > * + .nuxy-md-h2,
    div > * + .nuxy-md-h3,
    div > * + .nuxy-md-h4,
    div > * + .nuxy-md-h5,
    div > * + .nuxy-md-h6,
    div > * + .nuxy-md-p,
    div > * + .nuxy-md-ul,
    div > * + .nuxy-md-ol,
    div > * + .nuxy-md-blockquote,
    div > * + .nuxy-md-hr,
    div > * + .nuxy-code-block,
    div > * + .nuxy-table-container {
      margin-top: var(--space-5);
    }

    .nuxy-md-p {
      margin: 0;
    }

    .nuxy-md-h1,
    .nuxy-md-h2,
    .nuxy-md-h3,
    .nuxy-md-h4,
    .nuxy-md-h5,
    .nuxy-md-h6 {
      font-weight: 600;
      line-height: 1.3;
      color: var(--text-primary);
      margin: 0;
    }

    .nuxy-md-h1 {
      font-size: 1.4em;
    }
    .nuxy-md-h2 {
      font-size: 1.2em;
    }
    .nuxy-md-h3 {
      font-size: 1.05em;
    }
    .nuxy-md-h4,
    .nuxy-md-h5,
    .nuxy-md-h6 {
      font-size: 1em;
    }

    .nuxy-md-ul,
    .nuxy-md-ol {
      margin: 0;
      padding-left: 1.4em;
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .nuxy-md-li {
      line-height: 1.55;
    }

    .nuxy-md-li > .nuxy-md-ul,
    .nuxy-md-li > .nuxy-md-ol {
      margin-top: var(--space-1);
    }

    .nuxy-md-hr {
      border: none;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      margin: 0;
    }

    .nuxy-md-blockquote {
      margin: 0;
      padding: var(--space-3) var(--space-4);
      border-left: 3px solid rgba(255, 255, 255, 0.15);
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
      background: rgba(255, 255, 255, 0.03);
      color: var(--text-secondary, rgba(255, 255, 255, 0.65));
      font-style: italic;
    }

    .nuxy-md-inline-code {
      font-family: monospace;
      font-size: 0.875em;
      padding: 1px 5px;
      border-radius: var(--radius-sm);
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--syntax-function, #a78bfa);
      word-break: break-word;
    }

    strong {
      font-weight: 600;
      color: var(--text-primary);
    }

    em {
      font-style: italic;
      color: var(--text-secondary, rgba(255, 255, 255, 0.75));
    }

    .nuxy-md-link {
      color: var(--syntax-string);
      text-decoration: underline;
      text-underline-offset: 2px;
      text-decoration-color: rgba(122, 162, 247, 0.4);
      cursor: pointer;
      transition:
        color 0.15s ease,
        text-decoration-color 0.15s ease;
    }

    .nuxy-md-link:hover {
      color: var(--text-accent);
      text-decoration-color: currentColor;
    }

    .nuxy-md-table {
      font-size: var(--font-xs);
    }
  `

  @property({ type: String })
  declare content: string

  private _contentRef: HTMLDivElement | null = null

  updated(): void {
    if (this._contentRef) {
      renderMarkdownTo(this._contentRef, this.content ?? '')
    }
  }

  private onContentRef = (el: Element | undefined): void => {
    this._contentRef = (el as HTMLDivElement | null | undefined) ?? null
    if (this._contentRef) {
      renderMarkdownTo(this._contentRef, this.content ?? '')
    }
  }

  render(): TemplateResult {
    return html`<div ${ref(this.onContentRef)}></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-markdown-text': NuxyMarkdownTextElement
  }
}
