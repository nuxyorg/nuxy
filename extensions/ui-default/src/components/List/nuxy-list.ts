import { LitElement, html, css, customElement, property } from '@nuxyorg/core'
import { scrollListActiveItem } from '../../hooks/scroll-into-view'
import {
  createListIndicatorState,
  findListIndicatorElement,
  resolveActiveItem,
  updateListIndicatorElement,
  type ListIndicatorState,
} from '../../hooks/list-indicator'

@customElement('nuxy-list')
export class NuxyListElement extends LitElement {
  @property({ type: String, attribute: 'max-height', reflect: true })
  declare maxHeight: string
  @property({ type: Number, attribute: 'active-index' })
  declare activeIndex: number
  @property({ type: Number, attribute: 'scroll-lookahead' })
  declare scrollLookahead: number
  @property({ type: Number, attribute: 'scroll-speed' })
  declare scrollSpeed: number

  private _indicatorState: ListIndicatorState = createListIndicatorState()
  private _visibilityObserver: IntersectionObserver | null = null
  private _childObserver: MutationObserver | null = null
  private _observersAttached = false

  disconnectedCallback(): void {
    this._visibilityObserver?.disconnect()
    this._visibilityObserver = null
    this._childObserver?.disconnect()
    this._childObserver = null
    this._observersAttached = false
    super.disconnectedCallback()
  }

  protected firstUpdated(): void {
    this._attachObservers()
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

    this._childObserver = new MutationObserver(() => {
      if (this.activeIndex >= 0) {
        requestAnimationFrame(() => this._updateIndicator())
      }
    })
    this._childObserver.observe(this, { childList: true, subtree: true })
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      position: relative;
      padding-block: var(--space-2);
      gap: var(--space-0);
    }

    :host([max-height='md']) {
      max-height: 320px;
    }

    .indicator {
      position: absolute;
      left: var(--space-2);
      right: var(--space-2);
      top: 0;
      background-color: var(--syntax-comment);
      border-radius: var(--radius-md);
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
  `

  updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has('activeIndex')) {
      const previousActiveIndex = changedProperties.get('activeIndex') as number
      const scrollLookaheadPadding = Number.isFinite(this.scrollLookahead)
        ? this.scrollLookahead
        : undefined
      const scrollSpeed = Number.isFinite(this.scrollSpeed) ? this.scrollSpeed : undefined
      scrollListActiveItem(this, this.activeIndex, previousActiveIndex, {
        scrollLookaheadPadding,
        scrollSpeed,
      })
      requestAnimationFrame(() => this._updateIndicator())
    }
  }

  private _updateIndicator(): void {
    if (this.offsetHeight === 0) return
    const target = resolveActiveItem(this, this.activeIndex, 'nuxy-list-item')
    if (target && target.offsetHeight === 0) return
    const indicator = findListIndicatorElement(this)
    if (!indicator) return
    this._indicatorState = updateListIndicatorElement(indicator, target, this._indicatorState)
  }

  render() {
    return html`<div class="indicator"></div>
      <slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-list': NuxyListElement
  }
}
