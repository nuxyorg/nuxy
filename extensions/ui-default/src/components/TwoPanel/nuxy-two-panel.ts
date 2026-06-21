import { LitElement, html, css, customElement, property } from '@nuxyorg/core'
import { getZoom } from '../../utils/zoom'
import { parseRatio, clampSplitRatio, isSplitLocked } from '../../utils/parse-ratio'

@customElement('nuxy-two-panel')
export class NuxyTwoPanelElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: row;
      height: 100%;
      overflow: hidden;
    }

    ::slotted([slot='left']) {
      flex-shrink: 0;
      overflow-x: hidden;
      overflow-y: overlay;
    }

    :host([hide-left]) ::slotted([slot='left']) {
      display: none;
    }

    :host([hide-left]) .handle {
      display: none;
    }

    ::slotted([slot='right']) {
      flex: 1;
      min-height: 0;
      min-width: 0;
      border-left: 1px solid var(--border);
    }

    ::slotted([slot='right']:not(nuxy-two-panel)) {
      display: flex;
      flex-direction: column;
      overflow-y: overlay;
    }

    ::slotted([slot='right']:is(nuxy-two-panel)) {
      width: 100%;
    }

    .handle {
      flex-shrink: 0;
      width: 8px;
      margin: 0 -4px;
      cursor: col-resize;
      z-index: 1;
      border-radius: 4px;
      transition: background 150ms;
    }

    .handle[hidden] {
      display: none;
    }

    .handle:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    .handle:active {
      background: rgba(255, 255, 255, 0.1);
    }
  `

  /** Minimum width ratio for each panel (e.g. `1/4` → draggable between 1/4 and 3/4). */
  @property({ type: String, attribute: 'min-scale' })
  declare minScale: string

  /** Initial left-panel width ratio (e.g. `1/3`, `0.4`, `40%`). */
  @property({ type: String, attribute: 'default-position' })
  declare defaultPosition: string

  @property({ type: Boolean, attribute: 'hide-left', reflect: true })
  declare hideLeft: boolean

  private observer: MutationObserver | null = null
  private resizeObserver: ResizeObserver | null = null
  private _positionInitialized = false
  private _ratio = 0.5
  private _dragging = false
  private _dragStartX = 0
  private _dragStartRatio = 0

  constructor() {
    super()
    this.minScale = '1/4'
    this.defaultPosition = '1/2'
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.assignSlots()
    this.observer = new MutationObserver(() => {
      this.assignSlots()
      this.sync()
    })
    this.observer.observe(this, { childList: true })
    this.resizeObserver = new ResizeObserver(() => this.sync())
    this.resizeObserver.observe(this)
    this.initPosition()
    this.sync()
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.observer?.disconnect()
    this.observer = null
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('defaultPosition') && !this._positionInitialized) {
      this.initPosition()
    }
    if (changed.has('minScale')) {
      this._ratio = clampSplitRatio(this._ratio, this.getMinScaleRatio())
    }
    this.sync()
  }

  private getMinScaleRatio(): number {
    return parseRatio(this.minScale, 0.25)
  }

  private get locked(): boolean {
    return isSplitLocked(this.getMinScaleRatio())
  }

  private initPosition(): void {
    this._ratio = clampSplitRatio(parseRatio(this.defaultPosition, 0.5), this.getMinScaleRatio())
    this._positionInitialized = true
  }

  private getHandle(): HTMLElement | null {
    return this.shadowRoot?.querySelector<HTMLElement>('.handle') ?? null
  }

  private getLeft(): HTMLElement | undefined {
    return (this.querySelector('[slot="left"]') ?? Array.from(this.children)[0]) as
      | HTMLElement
      | undefined
  }

  private assignSlots(): void {
    const children = Array.from(this.children) as HTMLElement[]
    if (children[0] && children[0].slot !== 'right') children[0].slot = 'left'
    if (children[1] && children[1].slot !== 'left') children[1].slot = 'right'
  }

  private sync(): void {
    const left = this.getLeft()
    if (!left) return
    const ratio = this.locked ? 0.5 : clampSplitRatio(this._ratio, this.getMinScaleRatio())
    this._ratio = ratio
    left.style.width = `${ratio * 100}%`
    const handle = this.getHandle()
    if (handle) {
      handle.hidden = this.locked
      handle.style.cursor = this.locked ? 'default' : 'col-resize'
    }
  }

  private _onPointerDown(e: PointerEvent): void {
    if (this.locked) return
    e.preventDefault()
    const handle = e.currentTarget as HTMLElement
    handle.setPointerCapture(e.pointerId)
    this._dragging = true
    this._dragStartX = e.clientX
    this._dragStartRatio = this._ratio
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  private _onPointerMove(e: PointerEvent): void {
    if (!this._dragging || this.locked) return
    const delta = (e.clientX - this._dragStartX) / getZoom()
    const hostWidth = this.offsetWidth
    if (hostWidth <= 0) return
    const deltaRatio = delta / hostWidth
    this._ratio = clampSplitRatio(this._dragStartRatio + deltaRatio, this.getMinScaleRatio())
    this.sync()
  }

  private _onPointerUp(): void {
    if (!this._dragging) return
    this._dragging = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    this.dispatchEvent(
      new CustomEvent('split-change', {
        detail: { ratio: this._ratio },
        bubbles: true,
        composed: true,
      })
    )
  }

  render() {
    return html`
      <slot name="left"></slot>
      <div
        class="handle"
        ?hidden=${this.locked}
        @pointerdown=${this._onPointerDown}
        @pointermove=${this._onPointerMove}
        @pointerup=${this._onPointerUp}
      ></div>
      <slot name="right"></slot>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-two-panel': NuxyTwoPanelElement
  }
  interface HTMLElementEventMap {
    'split-change': CustomEvent<{ ratio: number }>
  }
}
