import { LitElement, html, css, customElement, property, state } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'

const COPY_ICON: TemplateResult = html`<svg
  width="12"
  height="12"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <rect x="9" y="9" width="13" height="13" rx="2" />
  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
</svg>`
const CHECK_ICON: TemplateResult = html`<svg
  width="12"
  height="12"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2.5"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <polyline points="20 6 9 17 4 12" />
</svg>`

@customElement('nuxy-copy-button')
export class NuxyCopyButtonElement extends LitElement {
  static styles = css`
    :host {
      display: contents;
    }

    button {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-1) var(--space-3);
      background: transparent;
      border: 1px solid var(--syntax-comment);
      border-radius: var(--radius-md);
      color: var(--syntax-comment);
      font-size: var(--font-sm);
      cursor: pointer;
      transition:
        border-color 0.15s ease,
        color 0.15s ease;
      white-space: nowrap;
    }

    button:hover {
      border-color: var(--syntax-operator);
      color: var(--syntax-operator);
    }

    button.nuxy-copy-button--copied {
      border-color: var(--syntax-green);
      color: var(--syntax-green);
    }
  `

  @property({ type: String })
  declare value: string
  @property({ type: String })
  declare label: string
  @property({ attribute: 'copied-label', type: String })
  declare copiedLabel: string
  @property({ type: Number })
  declare timeout: number

  @state()
  declare private copied: boolean

  private resetTimer: ReturnType<typeof setTimeout> | null = null

  disconnectedCallback(): void {
    super.disconnectedCallback()
    if (this.resetTimer !== null) clearTimeout(this.resetTimer)
  }

  private getTimeout(): number {
    return Number.isFinite(this.timeout) ? this.timeout : 1500
  }

  private async handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.value)
      this.markCopied()
    } catch {
      const el = document.createElement('textarea')
      el.value = this.value
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      this.markCopied()
    }
  }

  private markCopied(): void {
    this.copied = true
    this.dispatchEvent(new CustomEvent('nuxy-copy-button-copied', { bubbles: true }))
    if (this.resetTimer !== null) clearTimeout(this.resetTimer)
    this.resetTimer = setTimeout(() => {
      this.copied = false
    }, this.getTimeout())
  }

  render(): TemplateResult {
    const displayLabel = this.copied ? this.copiedLabel : this.label

    return html`
      <button
        type="button"
        class=${this.copied ? 'nuxy-copy-button--copied' : ''}
        aria-label=${displayLabel}
        @click=${this.handleCopy}
      >
        <span>${this.copied ? CHECK_ICON : COPY_ICON}</span>
        <span>${displayLabel}</span>
      </button>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-copy-button': NuxyCopyButtonElement
  }
}
