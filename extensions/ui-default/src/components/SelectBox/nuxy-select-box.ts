import './index.css'
import {
  LitElement,
  html,
  css,
  customElement,
  property,
  state,
  type PropertyValues,
  type TemplateResult,
} from '@nuxy/core'
import { smoothScrollElementToStart } from '../../hooks/scroll-into-view'

export interface SelectOption {
  value: string
  label: string
}

function parseOptions(raw: string | null): SelectOption[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as SelectOption[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function getZoom(): number {
  const z = document.documentElement.style.zoom
  if (!z) return 1
  if (z.endsWith('%')) return parseFloat(z) / 100
  return parseFloat(z) || 1
}

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

  // Body-portal dropdown elements — kept imperative
  private dropdown: HTMLDivElement | null = null
  private searchInput: HTMLInputElement | null = null
  private optionsEl: HTMLDivElement | null = null
  @state()
  declare private searchQuery: string
  @state()
  declare private internalFocused: number
  private escapeHandler: ((e: KeyboardEvent) => void) | null = null
  private scrollRaf: number | null = null
  private instantScrollOnNextRender = false

  connectedCallback(): void {
    super.connectedCallback()
    if (this.isOpen()) {
      this.onOpenTransition()
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEscapeListener()
    this.detachDropdown()
    if (this.scrollRaf !== null) {
      cancelAnimationFrame(this.scrollRaf)
      this.scrollRaf = null
    }
  }

  updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('open')) {
      if (this.open) this.onOpenTransition()
      else this.onCloseTransition()
    }
    // Re-render dropdown content when relevant state/attrs change
    if (this.isOpen()) {
      if (!this.dropdown || !this.dropdown.isConnected) {
        this.mountDropdown()
      } else {
        this.renderDropdown()
      }
    }
  }

  private isOpen(): boolean {
    return this.open
  }

  private isSearchable(): boolean {
    return this.searchable
  }

  private getOptions(): SelectOption[] {
    return parseOptions(this.options)
  }

  private getValue(): string | undefined {
    const v = this.value
    return v === undefined || v === '' ? undefined : v
  }

  private getFocusedIndex(): number {
    if (this.isSearchable()) return this.internalFocused
    const index = this.focusedIndex
    return Number.isFinite(index) ? index : 0
  }

  private onTriggerMouseDown = (e: MouseEvent): void => {
    e.preventDefault()
  }

  private onTriggerClick = (e: MouseEvent): void => {
    e.stopPropagation()
    if (this.isOpen()) {
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

  private onOpenTransition(): void {
    const options = this.getOptions()
    const value = this.getValue()
    this.internalFocused = Math.max(
      0,
      options.findIndex((o) => o.value === value)
    )
    this.searchQuery = ''
    if (this.searchInput) this.searchInput.value = ''
    this.instantScrollOnNextRender = true
    this.mountDropdown()
    this.addEscapeListener()
  }

  private onCloseTransition(): void {
    this.removeEscapeListener()
    this.detachDropdown()
    this.searchQuery = ''
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

  // --- Body-portal dropdown: fully imperative ---

  private mountDropdown(): void {
    const options = this.getOptions()
    if (options.length === 0) return

    if (!this.dropdown) {
      this.dropdown = document.createElement('div')
      this.dropdown.className = 'nuxy-select-box__dropdown'
      this.dropdown.setAttribute('role', 'listbox')

      if (this.isSearchable()) {
        const searchWrapper = document.createElement('div')
        searchWrapper.className = 'nuxy-select-box__search-wrapper'

        this.searchInput = document.createElement('input')
        this.searchInput.className = 'nuxy-select-box__search'
        this.searchInput.setAttribute('aria-label', 'Search options')
        this.searchInput.placeholder = 'Search…'
        this.searchInput.tabIndex = -1
        this.searchInput.addEventListener('mousedown', (e) => e.stopPropagation())
        this.searchInput.addEventListener('input', this.onSearchInput)
        this.searchInput.addEventListener('keydown', this.onSearchKeyDown)

        searchWrapper.appendChild(this.searchInput)
        this.dropdown.appendChild(searchWrapper)
      }

      this.optionsEl = document.createElement('div')
      this.optionsEl.className = 'nuxy-select-box__options'
      this.dropdown.appendChild(this.optionsEl)
    }

    if (!this.dropdown.isConnected) {
      document.body.appendChild(this.dropdown)
    }

    this.positionDropdown()
    this.renderDropdown()

    requestAnimationFrame(() => this.positionDropdown())

    if (this.isSearchable() && this.searchInput) {
      setTimeout(() => this.searchInput?.focus(), 30)
    }
  }

  private detachDropdown(): void {
    this.dropdown?.remove()
  }

  private getTriggerButton(): HTMLButtonElement | null {
    return this.renderRoot.querySelector<HTMLButtonElement>('.nuxy-select-box__trigger')
  }

  private positionDropdown(): void {
    const triggerBtn = this.getTriggerButton()
    if (!this.dropdown || !triggerBtn) return

    triggerBtn.scrollIntoView({ block: 'nearest', inline: 'nearest' })

    const zoom = getZoom()
    const r = triggerBtn.getBoundingClientRect()
    const w = this.dropdown.offsetWidth || 160
    const h = this.dropdown.offsetHeight || 200
    const gap = 4
    const margin = 8

    const viewportHeight = window.innerHeight / zoom
    const viewportWidth = window.innerWidth / zoom

    // getBoundingClientRect() returns viewport pixels; fixed positioning under
    // CSS zoom works in zoom-space, so divide rect values by zoom to match.
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

    this.dropdown.style.position = 'fixed'
    this.dropdown.style.top = `${top}px`
    this.dropdown.style.left = `${left}px`
    this.dropdown.style.transform = 'none'
    this.dropdown.style.margin = '0'
  }

  private getFilteredOptions(): SelectOption[] {
    const options = this.getOptions()
    if (!this.isSearchable() || !this.searchQuery.trim()) return options
    const q = this.searchQuery.toLowerCase()
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    )
  }

  private onSearchInput = (): void => {
    this.searchQuery = this.searchInput?.value ?? ''
    this.internalFocused = 0
    this.renderDropdown()
  }

  private onSearchKeyDown = (e: KeyboardEvent): void => {
    const filtered = this.getFilteredOptions()
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      e.stopPropagation()
      this.internalFocused = Math.min(this.internalFocused + 1, filtered.length - 1)
      this.renderDropdown()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      this.internalFocused = Math.max(this.internalFocused - 1, 0)
      this.renderDropdown()
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

  private selectOption(value: string): void {
    this.dispatchEvent(
      new CustomEvent('nuxy-select-box-select', {
        detail: { value },
        bubbles: true,
        composed: true,
      })
    )
  }

  private renderDropdown(): void {
    if (!this.optionsEl || !this.isOpen()) return

    const filtered = this.getFilteredOptions()
    const value = this.getValue()
    const focusedIndex = this.getFocusedIndex()

    this.optionsEl.replaceChildren()

    if (filtered.length === 0) {
      const noResults = document.createElement('div')
      noResults.className = 'nuxy-select-box__no-results'
      noResults.textContent = 'No results'
      this.optionsEl.appendChild(noResults)
      return
    }

    for (let i = 0; i < filtered.length; i++) {
      const option = filtered[i]
      const isFocused = i === focusedIndex
      const isSelected = option.value === value

      const el = document.createElement('div')
      el.setAttribute('role', 'option')
      el.setAttribute('aria-selected', String(isSelected))
      el.className = [
        'nuxy-select-box__option',
        isFocused ? 'nuxy-select-box__option--focused' : '',
        isSelected ? 'nuxy-select-box__option--selected' : '',
      ]
        .filter(Boolean)
        .join(' ')

      const label = document.createElement('span')
      label.className = 'nuxy-select-box__option-label'
      label.textContent = option.label
      el.appendChild(label)

      if (isSelected) {
        const check = document.createElement('span')
        check.className = 'nuxy-select-box__option-check'
        check.textContent = '✓'
        el.appendChild(check)
      }

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        this.selectOption(option.value)
      })

      this.optionsEl.appendChild(el)
    }

    const focusedEl = this.optionsEl.querySelector(
      '.nuxy-select-box__option--focused'
    ) as HTMLElement | null

    if (this.scrollRaf !== null) {
      cancelAnimationFrame(this.scrollRaf)
      this.scrollRaf = null
    }

    this.positionDropdown()

    if (focusedEl) {
      const instant = this.instantScrollOnNextRender
      this.scrollRaf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          smoothScrollElementToStart(focusedEl, instant)
          if (instant) this.instantScrollOnNextRender = false
          this.scrollRaf = null
        })
      })
    }
  }

  // --- Lit render: trigger button only ---

  render(): TemplateResult {
    const options = this.getOptions()
    const value = this.getValue()
    const placeholder = this.placeholder || '—'
    const currentLabel = options.find((o) => o.value === value)?.label ?? placeholder
    const open = this.isOpen()

    return html`
      <button
        type="button"
        tabindex="-1"
        class=${['nuxy-select-box__trigger', open ? 'nuxy-select-box__trigger--open' : '']
          .filter(Boolean)
          .join(' ')}
        @mousedown=${this.onTriggerMouseDown}
        @click=${this.onTriggerClick}
      >
        <span class="nuxy-select-box__value">${currentLabel}</span>
        <span
          class=${['nuxy-select-box__chevron', open ? 'nuxy-select-box__chevron--open' : '']
            .filter(Boolean)
            .join(' ')}
          >▾</span
        >
      </button>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-select-box': NuxySelectBoxElement
  }
}
