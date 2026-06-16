import { LitElement, html, css, customElement, property } from '@nuxyorg/core'
import { getZoom } from '../../utils/zoom'

@customElement('nuxy-two-panel')
export class NuxyTwoPanelElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      height: 100%;
      overflow: hidden;
      position: relative;
    }

    ::slotted(:first-child) {
      flex-shrink: 0;
      overflow-x: hidden;
      overflow-y: overlay;
      border-right: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    :host([hide-left]) ::slotted(:first-child) {
      display: none;
    }

    :host([hide-left]) .handle {
      display: none;
    }

    ::slotted(:last-child) {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .handle {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 8px;
      transform: translateX(-50%);
      cursor: col-resize;
      z-index: 1;
      border-radius: 4px;
      transition: background 150ms;
    }

    .handle:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    .handle:active {
      background: rgba(255, 255, 255, 0.1);
    }
  `

  @property({ type: String })
  declare split: string

  @property({ type: Boolean, attribute: 'hide-left', reflect: true })
  declare hideLeft: boolean

  @property({ type: Number, attribute: 'min-left' })
  minLeft = 80

  @property({ type: Number, attribute: 'min-right' })
  minRight = 80

  private observer: MutationObserver | null = null
  private _dragging = false
  private _dragStartX = 0
  private _dragStartWidth = 0

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
    const left = Array.from(this.children)[0] as HTMLElement | undefined
    if (!left) return
    if (this.split) left.style.width = this.split
    this._repositionHandle()
  }

  private _repositionHandle(): void {
    const handle = this.shadowRoot?.querySelector<HTMLElement>('.handle')
    const left = Array.from(this.children)[0] as HTMLElement | undefined
    if (!handle || !left) return
    handle.style.left = `${left.offsetWidth}px`
  }

  private _onPointerDown(e: PointerEvent): void {
    e.preventDefault()
    const handle = e.currentTarget as HTMLElement
    handle.setPointerCapture(e.pointerId)
    this._dragging = true
    this._dragStartX = e.clientX
    this._dragStartWidth = (Array.from(this.children)[0] as HTMLElement)?.offsetWidth ?? 0
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  private _onPointerMove(e: PointerEvent): void {
    if (!this._dragging) return
    const delta = (e.clientX - this._dragStartX) / getZoom()
    const newWidth = Math.max(
      this.minLeft,
      Math.min(this.offsetWidth - this.minRight, this._dragStartWidth + delta)
    )
    const left = Array.from(this.children)[0] as HTMLElement | undefined
    const handle = this.shadowRoot?.querySelector<HTMLElement>('.handle')
    if (left) left.style.width = `${newWidth}px`
    if (handle) handle.style.left = `${newWidth}px`
  }

  private _onPointerUp(): void {
    if (!this._dragging) return
    this._dragging = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    const left = Array.from(this.children)[0] as HTMLElement | undefined
    if (!left) return
    const newWidth = left.offsetWidth
    this.split = `${newWidth}px`
    this.dispatchEvent(
      new CustomEvent('split-change', {
        detail: { width: newWidth },
        bubbles: true,
        composed: true,
      })
    )
  }

  render() {
    return html`
      <slot></slot>
      <div
        class="handle"
        @pointerdown=${this._onPointerDown}
        @pointermove=${this._onPointerMove}
        @pointerup=${this._onPointerUp}
      ></div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-two-panel': NuxyTwoPanelElement
  }
  interface HTMLElementEventMap {
    'split-change': CustomEvent<{ width: number }>
  }
}
