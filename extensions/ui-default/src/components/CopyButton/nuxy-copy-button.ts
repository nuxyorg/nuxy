import './index.css'

const COPY_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`
const CHECK_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`

export class NuxyCopyButtonElement extends HTMLElement {
  private button: HTMLButtonElement | null = null
  private iconEl: HTMLSpanElement | null = null
  private labelEl: HTMLSpanElement | null = null
  private copied = false
  private resetTimer: ReturnType<typeof setTimeout> | null = null

  static get observedAttributes(): string[] {
    return ['value', 'label', 'copied-label', 'timeout', 'class']
  }

  connectedCallback(): void {
    this.style.display = 'contents'
    this.build()
    this.sync()
  }

  disconnectedCallback(): void {
    if (this.resetTimer !== null) clearTimeout(this.resetTimer)
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private build(): void {
    if (this.button) return

    this.button = document.createElement('button')
    this.button.type = 'button'
    this.iconEl = document.createElement('span')
    this.labelEl = document.createElement('span')
    this.button.append(this.iconEl, this.labelEl)
    this.button.addEventListener('click', () => this.handleCopy())
    this.appendChild(this.button)
  }

  private getTimeout(): number {
    const raw = this.getAttribute('timeout')
    if (raw === null || raw === '') return 1500
    const n = Number(raw)
    return Number.isFinite(n) ? n : 1500
  }

  private async handleCopy(): Promise<void> {
    const value = this.getAttribute('value') ?? ''
    try {
      await navigator.clipboard.writeText(value)
      this.markCopied()
    } catch {
      const el = document.createElement('textarea')
      el.value = value
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      this.markCopied()
    }
  }

  private markCopied(): void {
    this.copied = true
    this.sync()
    this.dispatchEvent(new CustomEvent('nuxy-copy-button-copied', { bubbles: true }))
    if (this.resetTimer !== null) clearTimeout(this.resetTimer)
    this.resetTimer = setTimeout(() => {
      this.copied = false
      this.sync()
    }, this.getTimeout())
  }

  private sync(): void {
    if (!this.button || !this.iconEl || !this.labelEl) return

    const extraClass = this.getAttribute('class') ?? ''
    const label = this.getAttribute('label') ?? 'Copy'
    const copiedLabel = this.getAttribute('copied-label') ?? 'Copied!'

    this.button.className = [
      'nuxy-copy-button',
      this.copied ? 'nuxy-copy-button--copied' : '',
      extraClass,
    ]
      .filter(Boolean)
      .join(' ')

    this.button.setAttribute('aria-label', this.copied ? copiedLabel : label)
    this.iconEl.innerHTML = this.copied ? CHECK_ICON : COPY_ICON
    this.labelEl.textContent = this.copied ? copiedLabel : label
  }
}

if (!customElements.get('nuxy-copy-button')) {
  customElements.define('nuxy-copy-button', NuxyCopyButtonElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-copy-button': NuxyCopyButtonElement
  }
}
