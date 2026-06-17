import {
  LitElement,
  html,
  css,
  customElement,
  property,
  query as queryDecorator,
} from '@nuxyorg/core'
import type { TemplateResult } from '@nuxyorg/core'

@customElement('nuxy-markdown-editor')
export class NuxyMarkdownEditorElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      overflow: hidden;
    }

    .nuxy-md-editor__toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1);
      padding: var(--space-2) var(--space-3);
      border-bottom: 1px solid rgba(255, 255, 255, 0.07);
      flex-shrink: 0;
    }

    .nuxy-md-editor__btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 28px;
      height: 24px;
      padding: 0 var(--space-2);
      border: none;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--text-secondary, rgba(255, 255, 255, 0.55));
      font-size: var(--font-xs);
      font-family: inherit;
      font-weight: 600;
      cursor: pointer;
      user-select: none;
      transition:
        background 0.1s ease,
        color 0.1s ease;
    }

    .nuxy-md-editor__btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-primary);
    }

    .nuxy-md-editor__btn:active {
      background: rgba(255, 255, 255, 0.14);
    }

    .nuxy-md-editor__divider {
      width: 1px;
      height: 16px;
      align-self: center;
      background: rgba(255, 255, 255, 0.1);
      margin: 0 var(--space-1);
      flex-shrink: 0;
    }

    .nuxy-md-editor__textarea {
      flex: 1;
      min-height: 0;
      width: 100%;
      padding: var(--space-4);
      background: transparent;
      border: none;
      color: var(--text-primary);
      font-size: var(--font-sm);
      font-family: inherit;
      line-height: 1.6;
      resize: none;
      outline: none;
      box-sizing: border-box;
      caret-color: var(--text-accent);
    }

    .nuxy-md-editor__textarea::placeholder {
      color: var(--text-tertiary, rgba(255, 255, 255, 0.3));
    }
  `

  @property({ type: String })
  declare value: string

  @property({ type: String })
  declare placeholder: string

  @queryDecorator('textarea')
  declare private textareaEl: HTMLTextAreaElement

  constructor() {
    super()
    this.value = ''
    this.placeholder = 'Start writing…'
  }

  private get _textarea(): HTMLTextAreaElement | null {
    return this.textareaEl ?? null
  }

  get nativeTextarea(): HTMLTextAreaElement | null {
    return this.textareaEl ?? null
  }

  private _insertText(text: string, cursorOffset = text.length): void {
    const ta = this._textarea
    if (!ta) return

    const { selectionStart: start, selectionEnd: end, value } = ta
    const newVal = value.slice(0, start) + text + value.slice(end)
    ta.value = newVal
    this._onInput()

    const pos = start + cursorOffset
    ta.setSelectionRange(pos, pos)
    ta.focus()
  }

  private _wrapSelection(open: string, close = open): void {
    const ta = this._textarea
    if (!ta) return

    const { selectionStart: start, selectionEnd: end, value } = ta
    const selected = value.slice(start, end)
    const wrapped = `${open}${selected || 'text'}${close}`
    this._insertText(wrapped, open.length)
    if (!selected) {
      const pos = start + open.length
      ta.setSelectionRange(pos, pos + 4)
    } else {
      const pos = start + wrapped.length
      ta.setSelectionRange(pos, pos)
    }
    ta.focus()
  }

  private _prependLine(prefix: string): void {
    const ta = this._textarea
    if (!ta) return

    const { selectionStart, value } = ta
    const lineStart = selectionStart ? value.lastIndexOf('\n', selectionStart - 1) + 1 : 0
    const atLineStart = lineStart === 0 || value[selectionStart - 1] === '\n'
    const newline = atLineStart ? '' : '\n'
    const text = `${newline}${prefix} `
    this._insertText(text, text.length)
  }

  private _insertTemplate(template: string): void {
    this._insertText('\n' + template + '\n', template.length + 1)
  }

  private _handleKeydown = (e: KeyboardEvent): void => {
    const ctrl = e.ctrlKey || e.metaKey
    if (ctrl) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault()
        this._wrapSelection('**')
        return
      }
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault()
        this._wrapSelection('_')
        return
      }
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault()
        this._onLinkClick()
        return
      }
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault()
        this._prependLine('#')
        return
      }
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        this._insertTemplate('| A | B |\n| --- | --- |\n| a | b |')
        return
      }
      if (e.key === 'u' || e.key === 'U') {
        e.preventDefault()
        this._prependLine('-')
        return
      }
      if (e.key === 'o' || e.key === 'O') {
        e.preventDefault()
        this._prependLine('1.')
        return
      }
    }

    if (e.key === 'Enter') {
      const ta = this._textarea
      if (!ta) return
      const { selectionStart, value } = ta
      const lineStart = selectionStart ? value.lastIndexOf('\n', selectionStart - 1) + 1 : 0
      const currentLine = value.slice(lineStart, selectionStart)

      const ulMatch = currentLine.match(/^( *- )/)
      const olMatch = currentLine.match(/^( *(\d+)\. )/)
      const isEmpty = /^( *[-\d.] *)$/.test(currentLine)

      if (isEmpty && (ulMatch || olMatch)) {
        e.preventDefault()
        // Remove the empty list marker
        ta.setSelectionRange(lineStart, selectionStart)
        this._insertText('', 0)
        return
      }

      if (ulMatch) {
        e.preventDefault()
        this._insertText('\n' + ulMatch[1], ulMatch[1].length + 1)
        return
      }

      if (olMatch) {
        e.preventDefault()
        const nextNum = Number(olMatch[2]) + 1
        const prefix = `\n${nextNum}. `
        this._insertText(prefix, prefix.length)
        return
      }
    }
  }

  private _onInput = (): void => {
    if (this._textarea) this.value = this._textarea.value
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  }

  private _onLinkClick = (): void => {
    const ta = this._textarea
    if (!ta) return
    const { selectionStart: start, selectionEnd: end, value } = ta
    const selected = value.slice(start, end)
    const text = selected || 'link'
    const md = `[${text}](https://)`
    this._insertText(md, text.length + 3)
    const urlStart = start + 1 + text.length + 2
    ta.setSelectionRange(urlStart, urlStart + 8)
    ta.focus()
  }

  render(): TemplateResult {
    return html`
      <div class="nuxy-md-editor__toolbar" @mousedown=${(e: MouseEvent) => e.preventDefault()}>
        <button
          class="nuxy-md-editor__btn"
          title="Heading 1 (Ctrl+H)"
          @click=${() => this._prependLine('#')}
        >
          H1
        </button>
        <button
          class="nuxy-md-editor__btn"
          title="Heading 2"
          @click=${() => this._prependLine('##')}
        >
          H2
        </button>
        <button
          class="nuxy-md-editor__btn"
          title="Heading 3"
          @click=${() => this._prependLine('###')}
        >
          H3
        </button>
        <div class="nuxy-md-editor__divider"></div>
        <button
          class="nuxy-md-editor__btn"
          title="Bold (Ctrl+B)"
          @click=${() => this._wrapSelection('**')}
        >
          <strong>B</strong>
        </button>
        <button
          class="nuxy-md-editor__btn"
          title="Italic (Ctrl+I)"
          @click=${() => this._wrapSelection('_')}
        >
          <em>I</em>
        </button>
        <div class="nuxy-md-editor__divider"></div>
        <button class="nuxy-md-editor__btn" title="Link (Ctrl+L)" @click=${this._onLinkClick}>
          🔗
        </button>
        <button
          class="nuxy-md-editor__btn"
          title="Unordered list (Ctrl+U)"
          @click=${() => this._prependLine('-')}
        >
          • —
        </button>
        <button
          class="nuxy-md-editor__btn"
          title="Ordered list (Ctrl+O)"
          @click=${() => this._prependLine('1.')}
        >
          1.
        </button>
        <div class="nuxy-md-editor__divider"></div>
        <button
          class="nuxy-md-editor__btn"
          title="Table (Ctrl+T)"
          @click=${() => this._insertTemplate('| A | B |\n| --- | --- |\n| a | b |')}
        >
          ⊞
        </button>
        <button
          class="nuxy-md-editor__btn"
          title="Horizontal rule"
          @click=${() => this._insertTemplate('---')}
        >
          —
        </button>
      </div>
      <textarea
        class="nuxy-md-editor__textarea"
        .value=${this.value}
        placeholder=${this.placeholder}
        spellcheck="false"
        @input=${this._onInput}
        @keydown=${this._handleKeydown}
      ></textarea>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-markdown-editor': NuxyMarkdownEditorElement
  }
}
