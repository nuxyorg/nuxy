import { LitElement, html, css, customElement, property } from '@nuxy/core'
import { scrollListActiveItem } from '../../hooks/scroll-into-view'

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

  private _indicatorWasHidden = true

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      position: relative;
      padding-block: var(--space-2);
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

  private _resetIndicatorPosition(indicator: HTMLElement): void {
    indicator.style.transition = 'none'
    indicator.style.transform = 'translateY(0px)'
    indicator.style.height = '0px'
    void indicator.offsetHeight
    indicator.style.transition = ''
    this._indicatorWasHidden = true
  }

  private _updateIndicator(): void {
    const items = Array.from(this.querySelectorAll<HTMLElement>('nuxy-list-item'))
    const idx = this.activeIndex ?? null
    const target = idx !== null && !isNaN(idx) && idx >= 0 ? items[idx] : null
    const indicator = this.shadowRoot?.querySelector<HTMLElement>('.indicator')
    if (!indicator) return
    if (!target) {
      indicator.classList.remove('visible')
      this._resetIndicatorPosition(indicator)
      return
    }

    const snap = this._indicatorWasHidden
    if (snap) {
      indicator.style.transition = 'none'
      this._indicatorWasHidden = false
    }

    indicator.style.transform = `translateY(${target.offsetTop}px)`
    indicator.style.height = `${target.offsetHeight}px`
    indicator.classList.add('visible')

    if (snap) {
      void indicator.offsetHeight
      indicator.style.transition = ''
    }
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
