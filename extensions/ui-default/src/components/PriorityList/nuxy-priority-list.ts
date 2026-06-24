import { LitElement, html, css, customElement, property } from '@nuxyorg/core'
import { repeat } from 'lit/directives/repeat.js'
import {
  createListIndicatorState,
  computeListIndicatorPosition,
  findListIndicatorElement,
  resolveActiveItem,
  updateListIndicatorElement,
  type ListIndicatorState,
} from '../../hooks/list-indicator'
import {
  scrollBiasForIndexChange,
  smoothScrollIntoViewIfNeeded,
} from '../../hooks/scroll-into-view'

export interface PriorityListItem {
  value: string
  label: string
}

function parseItems(raw: string): PriorityListItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (item): item is PriorityListItem =>
          !!item &&
          typeof item === 'object' &&
          'value' in item &&
          typeof (item as PriorityListItem).value === 'string' &&
          'label' in item &&
          typeof (item as PriorityListItem).label === 'string'
      )
      .map((item) => ({ value: item.value, label: item.label }))
  } catch {
    return []
  }
}

const ITEM_SELECTOR = '.nuxy-priority-list__item'
const FLIP_MS = 180
const FLIP_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)'

@customElement('nuxy-priority-list')
export class NuxyPriorityListElement extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    .nuxy-priority-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      margin-top: var(--space-2);
      position: relative;
    }

    .indicator {
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      background-color: var(--syntax-comment);
      border-radius: var(--radius-sm, 4px);
      pointer-events: none;
      opacity: 0;
      will-change: transform, height;
      transition:
        transform 180ms cubic-bezier(0.4, 0, 0.2, 1),
        height 180ms cubic-bezier(0.4, 0, 0.2, 1),
        opacity 120ms;
    }

    .indicator.visible {
      opacity: 1;
    }

    .nuxy-priority-list__item {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-1) var(--space-2);
      border-radius: var(--radius-sm, 4px);
      font-size: var(--font-sm, 0.875em);
      color: var(--syntax-variable);
      position: relative;
      z-index: 1;
    }

    .nuxy-priority-list__rank {
      min-width: 1.25rem;
      opacity: 0.45;
      font-variant-numeric: tabular-nums;
      text-align: right;
      transition: opacity 120ms;
    }

    .nuxy-priority-list__item--focused .nuxy-priority-list__rank {
      opacity: 0.85;
    }

    .nuxy-priority-list__label {
      flex: 1;
      min-width: 0;
    }
  `

  /** JSON-encoded `PriorityListItem[]` in display order. */
  @property({ type: String })
  declare items: string

  /** Index of the focused item, or -1 when not editing. */
  @property({ type: Number, attribute: 'active-index' })
  declare activeIndex: number

  /** When true, highlights the active item. */
  @property({ type: Boolean, reflect: true })
  declare editing: boolean

  @property({ type: Number, attribute: 'scroll-speed' })
  declare scrollSpeed: number

  private _indicatorState: ListIndicatorState = createListIndicatorState()
  private _flipPositions = new Map<string, number>()
  private _prevIndicatorTop: number | null = null

  protected willUpdate(changedProperties: Map<string, unknown>): void {
    if (!this.shadowRoot) return
    const list = this.shadowRoot.querySelector('.nuxy-priority-list')
    if (!list) return

    if (changedProperties.has('items')) {
      const positions = new Map<string, number>()
      for (const el of list.querySelectorAll<HTMLElement>(ITEM_SELECTOR)) {
        const value = el.dataset.value
        if (value) positions.set(value, el.offsetTop)
      }
      if (positions.size > 0) this._flipPositions = positions
    }

    if (changedProperties.has('items') || changedProperties.has('activeIndex')) {
      const target = this._resolveActiveItem(list)
      if (target) this._prevIndicatorTop = target.offsetTop
    }
  }

  protected updated(changedProperties: Map<string, unknown>): void {
    const indexChanged = changedProperties.has('activeIndex')
    const editingChanged = changedProperties.has('editing')
    const itemsChanged = changedProperties.has('items')

    if (!indexChanged && !editingChanged && !itemsChanged) return

    if (indexChanged && this.editing && this.activeIndex >= 0 && !itemsChanged) {
      const previousActiveIndex = changedProperties.get('activeIndex') as number
      requestAnimationFrame(() => {
        const target = this._resolveActiveItem()
        if (!target) return
        smoothScrollIntoViewIfNeeded(target, {
          scrollBias: scrollBiasForIndexChange(this.activeIndex, previousActiveIndex),
          scrollSpeed: Number.isFinite(this.scrollSpeed) ? this.scrollSpeed : 0.15,
        })
      })
    }

    const shouldFlip = itemsChanged && this._flipPositions.size > 0
    if (shouldFlip) {
      requestAnimationFrame(() => {
        this._runFlipAnimation()
        this._flipPositions.clear()
        requestAnimationFrame(() => this._updateIndicator())
      })
      return
    }

    requestAnimationFrame(() => this._updateIndicator())
  }

  private _runFlipAnimation(): void {
    const list = this.shadowRoot?.querySelector('.nuxy-priority-list')
    if (!list) return

    for (const el of list.querySelectorAll<HTMLElement>(ITEM_SELECTOR)) {
      const value = el.dataset.value
      if (!value) continue
      const prevTop = this._flipPositions.get(value)
      if (prevTop === undefined) continue
      const delta = prevTop - el.offsetTop
      if (Math.abs(delta) < 1) continue

      el.style.transition = 'none'
      el.style.transform = `translateY(${delta}px)`
      void el.offsetHeight
      el.style.transition = `transform ${FLIP_MS}ms ${FLIP_EASE}`
      el.style.transform = ''

      const clear = () => {
        el.style.transition = ''
        el.style.transform = ''
        el.removeEventListener('transitionend', clear)
      }
      el.addEventListener('transitionend', clear)
    }
  }

  private _resolveActiveItem(container?: ParentNode): HTMLElement | null {
    const list = container ?? this.shadowRoot?.querySelector('.nuxy-priority-list')
    if (!list || !this.editing || this.activeIndex < 0) return null
    return resolveActiveItem(list, this.activeIndex, ITEM_SELECTOR)
  }

  private _updateIndicator(): void {
    if (this.offsetHeight === 0) return
    const target = this._resolveActiveItem()
    if (target && target.offsetHeight === 0) return
    const indicator = findListIndicatorElement(this)
    if (!indicator) return

    if (target && this._prevIndicatorTop !== null) {
      const { transform, height } = computeListIndicatorPosition(target)
      const nextTop = target.offsetTop
      if (Math.abs(this._prevIndicatorTop - nextTop) > 1) {
        indicator.style.transition = 'none'
        indicator.style.transform = `translateY(${this._prevIndicatorTop}px)`
        indicator.style.height = height
        indicator.classList.add('visible')
        void indicator.offsetHeight
        indicator.style.transition = ''
        indicator.style.transform = transform
        indicator.style.height = height
        this._indicatorState = { wasHidden: false }
        this._prevIndicatorTop = null
        return
      }
      this._prevIndicatorTop = null
    }

    this._indicatorState = updateListIndicatorElement(indicator, target, this._indicatorState)
  }

  render() {
    const parsed = parseItems(this.items)
    if (parsed.length === 0) return html``

    return html`
      <div class="nuxy-priority-list" role="list">
        <div class="indicator"></div>
        ${repeat(
          parsed,
          (item) => item.value,
          (item, index) => html`
            <div
              class="nuxy-priority-list__item ${this.editing && index === this.activeIndex
                ? 'nuxy-priority-list__item--focused'
                : ''}"
              role="listitem"
              data-value=${item.value}
            >
              <span class="nuxy-priority-list__rank">${index + 1}.</span>
              <span class="nuxy-priority-list__label">${item.label}</span>
            </div>
          `
        )}
      </div>
    `
  }
}
