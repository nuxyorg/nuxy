import { LitElement, html, css, nothing, customElement, property, ref } from '@nuxyorg/core'
import type { TemplateResult } from '@nuxyorg/core'
import { scrollListActiveItem } from '../../hooks/scroll-into-view'
import { createGridKeyActions } from '../../hooks/grid-navigation'
import { KeyActionsController } from '../../hooks/useToolKeyActions'
import {
  createListIndicatorState,
  findListIndicatorElement,
  resolveActiveItem,
  resolveGridIndicatorTarget,
  updateGridIndicatorElement,
  type ListIndicatorState,
} from '../../hooks/list-indicator'

@customElement('nuxy-grid')
export class NuxyGridElement extends LitElement {
  static styles = css`
    :host {
      display: grid;
      position: relative;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      padding: 4px 8px;
    }

    .indicator {
      position: absolute;
      top: 0;
      left: 0;
      background-color: var(--syntax-comment);
      border-radius: var(--radius-md);
      pointer-events: none;
      opacity: 0;
      will-change: transform, width, height;
      transition:
        transform 180ms cubic-bezier(0.4, 0, 0.2, 1),
        width 180ms cubic-bezier(0.4, 0, 0.2, 1),
        height 180ms cubic-bezier(0.4, 0, 0.2, 1),
        opacity 120ms;
    }

    .indicator.visible {
      opacity: 1;
    }
  `

  @property({ type: String })
  declare cols: string
  @property({ type: String })
  declare gap: string
  @property({ type: Number, attribute: 'active-index' })
  declare activeIndex: number
  @property({ type: Number, attribute: 'min-cell-width' })
  declare minCellWidth: number
  @property({ type: Boolean, attribute: 'keyboard-nav' })
  declare keyboardNav: boolean
  @property({ type: Boolean, attribute: 'omnibar-handoff' })
  declare omnibarHandoff: boolean
  /** When false, scroll only enough to keep the focused cell visible (no row look-ahead). */
  @property({ type: Boolean, attribute: 'scroll-lookahead' })
  declare scrollLookahead: boolean

  private _indicatorState: ListIndicatorState = createListIndicatorState()
  private _visibilityObserver: IntersectionObserver | null = null
  private _resizeObserver: ResizeObserver | null = null
  private _childObserver: MutationObserver | null = null
  private _observersAttached = false
  private _computedCols = 1
  private _keyActions: KeyActionsController | null = null

  connectedCallback(): void {
    super.connectedCallback()
    if (!Number.isFinite(this.activeIndex)) this.activeIndex = -1
    this.sync()
    if (this.keyboardNav) this._attachKeyActions()
  }

  disconnectedCallback(): void {
    this._visibilityObserver?.disconnect()
    this._visibilityObserver = null
    this._resizeObserver?.disconnect()
    this._resizeObserver = null
    this._childObserver?.disconnect()
    this._childObserver = null
    this._observersAttached = false
    this._keyActions = null
    super.disconnectedCallback()
  }

  protected firstUpdated(): void {
    this._attachObservers()
    this._measureCols()
  }

  private _attachKeyActions(): void {
    if (this._keyActions) return
    this._keyActions = new KeyActionsController(this, () =>
      createGridKeyActions({
        getActiveIndex: () => (Number.isFinite(this.activeIndex) ? this.activeIndex : -1),
        setActiveIndex: (index) => this._setActiveIndex(index),
        getItemCount: () => this.querySelectorAll('nuxy-grid-item').length,
        getCols: () => this._effectiveCols(),
        omnibarHandoff: this.omnibarHandoff,
      })
    )
  }

  private _setActiveIndex(index: number | ((prev: number) => number)): void {
    const prev = Number.isFinite(this.activeIndex) ? this.activeIndex : -1
    const next = typeof index === 'function' ? index(prev) : index
    if (!Number.isFinite(next) || next === prev) return
    // Keep local state in sync before the parent re-render so rapid key repeats work.
    this.activeIndex = next
    this.dispatchEvent(
      new CustomEvent('active-index-change', {
        detail: { index: next },
        bubbles: true,
        composed: true,
      })
    )
    window.core?.shell?.refreshShellActions()
  }

  private _attachObservers(): void {
    if (this._observersAttached) return
    this._observersAttached = true

    this._visibilityObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && this.activeIndex >= 0) {
          requestAnimationFrame(() => this._updateIndicator())
        }
      },
      { threshold: 0 }
    )
    this._visibilityObserver.observe(this)

    if (this.minCellWidth > 0) {
      this._resizeObserver = new ResizeObserver(() => this._measureCols())
      this._resizeObserver.observe(this)
      this._childObserver = new MutationObserver(() => {
        requestAnimationFrame(() => this._measureCols())
      })
      this._childObserver.observe(this, { childList: true })
    }
  }

  updated(changedProperties: Map<string, unknown>): void {
    this.sync()
    if (changedProperties.has('keyboardNav')) {
      if (this.keyboardNav) this._attachKeyActions()
    }
    if (changedProperties.has('minCellWidth')) {
      if (this.minCellWidth > 0 && !this._resizeObserver) {
        this._resizeObserver = new ResizeObserver(() => this._measureCols())
        this._resizeObserver.observe(this)
        this._childObserver = new MutationObserver(() => {
          requestAnimationFrame(() => this._measureCols())
        })
        this._childObserver.observe(this, { childList: true })
        this._measureCols()
      }
    }
    if (changedProperties.has('activeIndex')) {
      const previousActiveIndex = changedProperties.get('activeIndex') as number
      scrollListActiveItem(this, this.activeIndex, previousActiveIndex, {
        itemSelector: 'nuxy-grid-item',
        resolveTarget: resolveGridIndicatorTarget,
        scrollLookahead: this.scrollLookahead,
      })
      requestAnimationFrame(() => this._updateIndicator())
    } else if (changedProperties.has('cols')) {
      requestAnimationFrame(() => this._updateIndicator())
    }
  }

  private _effectiveCols(): number {
    if (this.minCellWidth > 0) return this._computedCols
    const parsed = parseInt(this.cols, 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
  }

  private _measureCols(): void {
    if (!this.minCellWidth || this.minCellWidth <= 0) return
    if (this.clientWidth <= 0) return
    const cols = this._readComputedCols()
    if (cols === this._computedCols) return
    this._computedCols = cols
    requestAnimationFrame(() => this._updateIndicator())
  }

  /** Count items in the first row — used for keyboard navigation with auto-fill grids. */
  private _readComputedCols(): number {
    const items = Array.from(this.querySelectorAll('nuxy-grid-item')) as NuxyGridItemElement[]
    if (items.length === 0) return 1

    let cols = 0
    let rowTop: number | null = null
    for (const item of items) {
      const btn = resolveGridIndicatorTarget(item)
      if (!btn) continue
      if (rowTop === null) {
        rowTop = btn.offsetTop
        cols = 1
      } else if (btn.offsetTop === rowTop) {
        cols++
      } else {
        break
      }
    }
    return Math.max(1, cols)
  }

  private sync(): void {
    if (this.minCellWidth > 0) {
      this.style.gridTemplateColumns = `repeat(auto-fill, minmax(min(${this.minCellWidth}px, 100%), 1fr))`
    } else {
      this.style.gridTemplateColumns = `repeat(${this.cols || 1}, minmax(0, 1fr))`
    }
    this.style.gap = `${this.gap}px`
  }

  private _updateIndicator(): void {
    if (this.offsetHeight === 0) return
    const item = resolveActiveItem(this, this.activeIndex, 'nuxy-grid-item')
    const target = resolveGridIndicatorTarget(item)
    if (target && target.offsetHeight === 0) return
    const indicator = findListIndicatorElement(this)
    if (!indicator) return
    this._indicatorState = updateGridIndicatorElement(indicator, target, this._indicatorState)
  }

  render() {
    return html`<div class="indicator"></div>
      <slot></slot>`
  }
}

@customElement('nuxy-grid-item')
export class NuxyGridItemElement extends LitElement {
  static styles = css`
    :host {
      display: contents;
    }

    .nuxy-grid-item {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      background: none;
      border: none;
      cursor: pointer;
      padding: var(--space-2) var(--space-1);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-1);
      position: relative;
      color: inherit;
      outline: none;
      transition: background 0.1s;
    }

    :host(:not([active])) .nuxy-grid-item:hover {
      background: var(--syntax-comment);
    }
  `

  @property({ type: Boolean, reflect: true })
  declare active: boolean
  @property({ type: Boolean })
  declare disabled: boolean
  @property({ type: String })
  declare type: string
  @property({ type: String })
  declare title: string
  @property({ attribute: 'aria-label', type: String })
  declare ariaLabel: string
  @property({ type: String })
  declare tabindex: string

  private buttonRef: HTMLButtonElement | null = null

  private onButtonRef = (el: Element | undefined): void => {
    this.buttonRef = (el as HTMLButtonElement | null | undefined) ?? null
  }

  render(): TemplateResult {
    const active = this.active || this.hasAttribute('active')
    const disabled = this.disabled || this.hasAttribute('disabled')
    const btnType = this.type || this.getAttribute('type') || 'button'
    const titleAttr = this.title || this.getAttribute('title') || ''
    const ariaLabelAttr = this.ariaLabel || this.getAttribute('aria-label') || ''
    const tabindexAttr = this.tabindex || this.getAttribute('tabindex') || ''

    const btnClass = ['nuxy-grid-item', active ? 'nuxy-grid-item--active' : '']
      .filter(Boolean)
      .join(' ')

    return html`
      <button
        class=${btnClass}
        type=${btnType}
        title=${titleAttr || nothing}
        aria-label=${ariaLabelAttr || nothing}
        tabindex=${tabindexAttr || nothing}
        ?disabled=${disabled}
        ${ref(this.onButtonRef)}
      >
        <slot></slot>
      </button>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-grid': NuxyGridElement
    'nuxy-grid-item': NuxyGridItemElement
  }
}
