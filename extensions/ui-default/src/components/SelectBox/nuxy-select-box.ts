import './index.css'
import './nuxy-select-trigger.ts'
import './nuxy-select-dropdown.ts'
import type { NuxySelectDropdownElement } from './nuxy-select-dropdown.ts'
import {
  LitElement,
  html,
  css,
  nothing,
  customElement,
  property,
  state,
  query as queryDecorator,
  type PropertyValues,
  type TemplateResult,
} from '@nuxyorg/core'
import {
  smoothScrollElementToStart,
  smoothScrollIntoViewIfNeeded,
  scrollBiasForIndexChange,
} from '../../hooks/scroll-into-view'
import { listIndicatorStyleForTarget } from '../../hooks/list-indicator'
import { getZoom } from '../../utils/zoom'
import { parseOptions, type SelectOption } from '../../utils/parse-options.ts'

export type { SelectOption }

@customElement('nuxy-select-box')
export class NuxySelectBoxElement extends LitElement {
  static styles = css`
    :host {
      position: relative;
      display: inline-flex;
    }

    .nuxy-select-box__trigger {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: 0;
      background: none;
      border: none;
      font-family: inherit;
      font-size: inherit;
      color: var(--syntax-keyword);
      cursor: pointer;
      white-space: nowrap;
      outline: none;
      transition: color 120ms;
    }

    .nuxy-select-box__trigger:hover,
    .nuxy-select-box__trigger--open {
      color: var(--syntax-variable);
    }

    .nuxy-select-box__value {
      line-height: 1;
    }

    .nuxy-select-box__chevron {
      opacity: 0.4;
      font-size: 9px;
      line-height: 1;
      flex-shrink: 0;
      transition:
        transform 150ms,
        opacity 150ms;
    }

    .nuxy-select-box__trigger:hover .nuxy-select-box__chevron,
    .nuxy-select-box__trigger--open .nuxy-select-box__chevron {
      opacity: 0.7;
    }

    .nuxy-select-box__chevron--open {
      transform: rotate(180deg);
    }
  `

  @property({ type: String })
  declare options: string
  @property({ type: String })
  declare value: string
  @property({ type: Boolean, reflect: true })
  declare open: boolean
  @property({ type: Number, attribute: 'focused-index' })
  declare focusedIndex: number
  @property({ type: Boolean, reflect: true })
  declare searchable: boolean
  @property({ type: String })
  declare placeholder: string
  @property({ type: Number, attribute: 'scroll-lookahead' })
  declare scrollLookahead: number
  @property({ type: Number, attribute: 'scroll-speed' })
  declare scrollSpeed: number

  @queryDecorator('.nuxy-select-box__trigger')
  private triggerQuery!: HTMLButtonElement

  @queryDecorator('nuxy-select-dropdown')
  private dropdownComponentQuery!: NuxySelectDropdownElement | null

  private triggerRef: HTMLButtonElement | null = null

  @state()
  declare private searchQuery: string
  @state()
  declare private internalFocused: number
  @state()
  declare private dropdownTop: number
  @state()
  declare private dropdownLeft: number
  @state()
  declare private indicatorTransform: string
  @state()
  declare private indicatorHeight: string
  @state()
  declare private indicatorVisible: boolean

  private dropdownEl: HTMLDivElement | null = null
  private optionsEl: HTMLDivElement | null = null
  private searchInputEl: HTMLInputElement | null = null
  private escapeHandler: ((e: KeyboardEvent) => void) | null = null
  private scrollRaf: number | null = null
  private instantScrollOnNextRender = false
  private previousFocusedIndex: number | undefined = undefined
  private hoveredOptionIndex: number | null = null

  connectedCallback(): void {
    super.connectedCallback()
    this.searchQuery = ''
    this.internalFocused = 0
    this.dropdownTop = 0
    this.dropdownLeft = 0
    this.indicatorTransform = ''
    this.indicatorHeight = ''
    this.indicatorVisible = false
    if (this.open) this.onOpenTransition()
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEscapeListener()
    if (this.scrollRaf !== null) {
      cancelAnimationFrame(this.scrollRaf)
      this.scrollRaf = null
    }
  }

  updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('focusedIndex') && this.searchable) {
      this.internalFocused = this.focusedIndex
    }
    if (changed.has('open')) {
      if (this.open) this.onOpenTransition()
      else this.onCloseTransition()
    }
    if (
      this.open &&
      (changed.has('open') ||
        changed.has('internalFocused') ||
        changed.has('searchQuery') ||
        changed.has('focusedIndex') ||
        changed.has('options') ||
        changed.has('value'))
    ) {
      this.pendingDropdownWork = this.afterDropdownRendered().then(() => {
        this.repositionDropdown()
        this.syncIndicator()
        requestAnimationFrame(() => {
          this.scheduleScrollToFocused()
          if (changed.has('open') && this.searchable) {
            setTimeout(() => this.searchInputEl?.focus(), 30)
          }
        })
      })
    }
  }

  private pendingDropdownWork: Promise<void> | null = null

  /**
   * Lit awaits this (in addition to the element's own render) before
   * resolving `updateComplete`. Needed because `updated()` fires as soon as
   * the host's *own* template is committed — the nested
   * `nuxy-select-dropdown` / `nuxy-select-option` custom elements' `render()`
   * calls (and the positioning/indicator work that depends on their
   * committed DOM) are still pending at that point.
   */
  protected async getUpdateComplete(): Promise<boolean> {
    const result = await super.getUpdateComplete()
    if (this.pendingDropdownWork) {
      await this.pendingDropdownWork
    }
    return result
  }

  /**
   * Waits for the `nuxy-select-dropdown` sub-component (and the
   * `nuxy-select-option` rows it renders) to finish committing their own
   * templates to the DOM. Needed because the host's `updated()` fires as
   * soon as *its own* template is committed — the nested custom elements'
   * `render()` calls are still pending at that point.
   */
  private async afterDropdownRendered(): Promise<void> {
    const dropdown = this.dropdownComponentQuery
    if (!dropdown) return
    await dropdown.updateComplete
    // eslint-disable-next-line no-restricted-syntax -- dynamic list rendered by a nested component; no ref/@query can target it by index
    const optionEls = Array.from(dropdown.querySelectorAll('nuxy-select-option'))
    await Promise.all(
      optionEls.map((el) => (el as unknown as { updateComplete: Promise<unknown> }).updateComplete)
    )
  }

  private onDropdownRef = (el: Element | undefined): void => {
    this.dropdownEl = (el as HTMLDivElement | null | undefined) ?? null
  }

  private onTriggerRef = (el: Element | undefined): void => {
    this.triggerRef = (el as HTMLButtonElement | null | undefined) ?? null
  }

  private onOptionsRef = (el: Element | undefined): void => {
    this.optionsEl = (el as HTMLDivElement | null | undefined) ?? null
  }

  private onSearchRef = (el: Element | undefined): void => {
    this.searchInputEl = (el as HTMLInputElement | null | undefined) ?? null
  }

  private isSearchable(): boolean {
    return this.searchable
  }

  private getOptions(): SelectOption[] {
    return parseOptions(this.options)
  }

  private getValue(): string {
    return this.value ?? ''
  }

  private valueMatches = (optionValue: unknown, current: string): boolean => {
    return String(optionValue) === current
  }

  private getFocusedIndex(): number {
    if (this.isSearchable()) return this.internalFocused
    const index = this.focusedIndex
    return Number.isFinite(index) ? index : 0
  }

  private getFilteredOptions(): SelectOption[] {
    const options = this.getOptions()
    if (!this.isSearchable() || !(this.searchQuery ?? '').trim()) return options
    const q = this.searchQuery.toLowerCase()
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    )
  }

  private onTriggerMouseDown = (e: MouseEvent): void => {
    e.preventDefault()
  }

  private onTriggerClick = (e: MouseEvent): void => {
    e.stopPropagation()
    if (this.open) {
      this.dispatchEvent(
        new CustomEvent('nuxy-select-box-close-request', { bubbles: true, composed: true })
      )
    } else {
      const options = this.getOptions()
      const value = this.getValue()
      const idx = Math.max(
        0,
        options.findIndex((o) => o.value === value)
      )
      this.dispatchEvent(
        new CustomEvent('nuxy-select-box-open-request', {
          detail: { startIndex: idx },
          bubbles: true,
          composed: true,
        })
      )
    }
  }

  private getSelectedIndex(): number {
    const options = this.getOptions()
    const value = this.getValue()
    return Math.max(
      0,
      options.findIndex((o) => o.value === value)
    )
  }

  private onOpenTransition(): void {
    this.internalFocused = this.getSelectedIndex()
    this.searchQuery = ''
    this.instantScrollOnNextRender = true
    this.addEscapeListener()
    const trigger = this.getTriggerButton()
    if (trigger) smoothScrollIntoViewIfNeeded(trigger)
  }

  private onCloseTransition(): void {
    this.removeEscapeListener()
    this.searchQuery = ''
    this.previousFocusedIndex = undefined
    this.hoveredOptionIndex = null
    this.indicatorVisible = false
    if (this.scrollRaf !== null) {
      cancelAnimationFrame(this.scrollRaf)
      this.scrollRaf = null
    }
  }

  private addEscapeListener(): void {
    if (this.escapeHandler) return
    this.escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        this.dispatchEvent(
          new CustomEvent('nuxy-select-box-close-request', { bubbles: true, composed: true })
        )
      }
    }
    document.addEventListener('keydown', this.escapeHandler, true)
  }

  private removeEscapeListener(): void {
    if (!this.escapeHandler) return
    document.removeEventListener('keydown', this.escapeHandler, true)
    this.escapeHandler = null
  }

  private getTriggerButton(): HTMLButtonElement | null {
    return this.triggerRef ?? this.triggerQuery ?? null
  }

  private getOptionEl(index: number): HTMLElement | null {
    if (!this.optionsEl) return null
    // eslint-disable-next-line no-restricted-syntax -- dynamic list rendered by a nested component; no ref/@query can target it by index
    const options = Array.from(this.optionsEl.querySelectorAll<HTMLElement>('[role="option"]'))
    return options[index] ?? null
  }

  private repositionDropdown(): void {
    const triggerBtn = this.getTriggerButton()
    const dropdown = this.dropdownEl
    if (!dropdown || !triggerBtn) return

    const zoom = getZoom()
    const r = triggerBtn.getBoundingClientRect()
    const w = dropdown.offsetWidth || 160
    const h = dropdown.offsetHeight || 200
    const gap = 4
    const margin = 8

    const viewportHeight = window.innerHeight / zoom
    const viewportWidth = window.innerWidth / zoom
    const rTop = r.top / zoom
    const rBottom = r.bottom / zoom
    const rRight = r.right / zoom

    let top = rBottom + gap
    if (top + h > viewportHeight - margin && rTop - gap - h >= margin) {
      top = rTop - gap - h
    }
    top = Math.max(margin, Math.min(top, viewportHeight - h - margin))

    let left = rRight - w
    left = Math.max(margin, Math.min(left, viewportWidth - w - margin))

    this.dropdownTop = top
    this.dropdownLeft = left
    dropdown.style.position = 'fixed'
    dropdown.style.top = `${top}px`
    dropdown.style.left = `${left}px`
    dropdown.style.transform = 'none'
    dropdown.style.margin = '0'
  }

  private syncIndicator(): void {
    const focusedIndex = this.getFocusedIndex()
    const targetIndex = this.hoveredOptionIndex ?? focusedIndex
    const el = this.getOptionEl(targetIndex)
    const style = listIndicatorStyleForTarget(el)
    this.indicatorTransform = style.transform
    this.indicatorHeight = style.height
    this.indicatorVisible = style.visible
  }

  private scheduleScrollToFocused(): void {
    const focusedIndex = this.getFocusedIndex()
    const focusedEl = this.getOptionEl(focusedIndex)

    if (this.scrollRaf !== null) {
      cancelAnimationFrame(this.scrollRaf)
      this.scrollRaf = null
    }

    if (!focusedEl) {
      this.previousFocusedIndex = focusedIndex
      return
    }

    const instant = this.instantScrollOnNextRender
    const scrollBias = scrollBiasForIndexChange(focusedIndex, this.previousFocusedIndex)

    this.scrollRaf = requestAnimationFrame(() => {
      if (instant) {
        smoothScrollElementToStart(focusedEl, true)
      } else {
        smoothScrollIntoViewIfNeeded(focusedEl, {
          scrollBias,
          scrollLookaheadPadding: Number.isFinite(this.scrollLookahead)
            ? this.scrollLookahead
            : undefined,
          scrollSpeed: Number.isFinite(this.scrollSpeed) ? this.scrollSpeed : undefined,
        })
      }
      if (instant) this.instantScrollOnNextRender = false
      this.syncIndicator()
      this.scrollRaf = null
    })

    this.previousFocusedIndex = focusedIndex
  }

  private onSearchInput = (e: Event): void => {
    this.searchQuery = (e.target as HTMLInputElement).value
    this.internalFocused = this.searchQuery.trim() ? 0 : this.getSelectedIndex()
  }

  private onSearchKeyDown = (e: KeyboardEvent): void => {
    const filtered = this.getFilteredOptions()
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      e.stopPropagation()
      this.internalFocused = Math.min(this.internalFocused + 1, filtered.length - 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      this.internalFocused = Math.max(this.internalFocused - 1, 0)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      const opt = filtered[this.internalFocused]
      if (opt) this.selectOption(opt.value)
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      this.dispatchEvent(
        new CustomEvent('nuxy-select-box-close-request', { bubbles: true, composed: true })
      )
    }
  }

  private onOptionMouseEnter = (index: number): void => {
    this.hoveredOptionIndex = index
    requestAnimationFrame(() => this.syncIndicator())
  }

  private onOptionsMouseLeave = (): void => {
    this.hoveredOptionIndex = null
    requestAnimationFrame(() => this.syncIndicator())
  }

  private selectOption = (value: string): void => {
    this.dispatchEvent(
      new CustomEvent('nuxy-select-box-select', {
        detail: { value },
        bubbles: true,
        composed: true,
      })
    )
  }

  private renderDropdown(): TemplateResult {
    const filtered = this.getFilteredOptions()

    return html`
      <nuxy-select-dropdown
        .options=${filtered}
        .value=${this.getValue()}
        .focusedIndex=${this.getFocusedIndex()}
        ?searchable=${this.isSearchable()}
        .searchQuery=${this.searchQuery}
        .top=${this.dropdownTop}
        .left=${this.dropdownLeft}
        .indicatorTransform=${this.indicatorTransform}
        .indicatorHeight=${this.indicatorHeight}
        .indicatorVisible=${this.indicatorVisible}
        .valueMatches=${this.valueMatches}
        .onDropdownRef=${this.onDropdownRef}
        .onSearchRef=${this.onSearchRef}
        .onOptionsRef=${this.onOptionsRef}
        .onSearchInput=${this.onSearchInput}
        .onSearchKeyDown=${this.onSearchKeyDown}
        .onOptionsMouseLeave=${this.onOptionsMouseLeave}
        .onOptionSelect=${this.selectOption}
        .onOptionHoverEnter=${this.onOptionMouseEnter}
      ></nuxy-select-dropdown>
    `
  }

  render(): TemplateResult {
    const options = this.getOptions()
    const value = this.getValue()
    const placeholder = this.placeholder || '—'
    const currentLabel =
      options.find((o) => this.valueMatches(o.value, value))?.label ?? placeholder

    return html`
      <nuxy-select-trigger
        .label=${currentLabel}
        ?open=${this.open}
        .onTriggerClick=${this.onTriggerClick}
        .onTriggerMouseDown=${this.onTriggerMouseDown}
        .onTriggerRef=${this.onTriggerRef}
      ></nuxy-select-trigger>
      ${this.open && options.length > 0 ? this.renderDropdown() : nothing}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-select-box': NuxySelectBoxElement
  }
}
