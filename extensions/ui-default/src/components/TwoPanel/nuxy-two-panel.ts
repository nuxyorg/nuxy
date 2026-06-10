import { LitElement, html, css, customElement, property } from '@nuxy/core'

@customElement('nuxy-two-panel')
export class NuxyTwoPanelElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      height: 100%;
      overflow: hidden;
    }

    ::slotted(:first-child) {
      flex-shrink: 0;
      overflow-y: overlay;
      border-right: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    ::slotted(:last-child) {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
  `

  @property({ type: String })
  declare split: string

  private observer: MutationObserver | null = null

  connectedCallback(): void {
    super.connectedCallback()
    this.observer = new MutationObserver(() => this.sync())
    this.observer.observe(this, { childList: true })
    this.sync()
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.observer?.disconnect()
    this.observer = null
  }

  updated(): void {
    this.sync()
  }

  private sync(): void {
    const children = Array.from(this.children)

    if (children[0]) {
      const left = children[0] as HTMLElement
      left.style.width = this.split
    }
  }

  render() {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-two-panel': NuxyTwoPanelElement
  }
}
