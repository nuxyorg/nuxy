import './index.css'
import { syncHostClasses } from '../../h.ts'
import { smoothScrollIntoViewIfNeeded } from '../../utils/scroll'

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

function parseIndex(attr: string | null, fallback = 0): number {
  if (attr === null || attr === '') return fallback
  const n = Number(attr)
  return Number.isFinite(n) ? n : fallback
}

export class NuxySelectBoxElement extends HTMLElement {
  private triggerBtn: HTMLButtonElement | null = null
  private valueEl: HTMLSpanElement | null = null
  private dropdown: HTMLDivElement | null = null
  private searchInput: HTMLInputElement | null = null
  private optionsEl: HTMLDivElement | null = null
  private searchQuery = ''
  private internalFocused = 0
  private escapeHandler: ((e: KeyboardEvent) => void) | null = null

  static get observedAttributes(): string[] {
    return ['options', 'value', 'open', 'focused-index', 'searchable', 'placeholder', 'class']
  }

  connectedCallback(): void {
    this.build()
    this.sync()
    if (this.isOpen()) this.onOpen()
    this.triggerBtn?.addEventListener('mousedown', this.onTriggerMouseDown)
    this.triggerBtn?.addEventListener('click', this.onTriggerClick)
  }

  disconnectedCallback(): void {
    this.triggerBtn?.removeEventListener('mousedown', this.onTriggerMouseDown)
    this.triggerBtn?.removeEventListener('click', this.onTriggerClick)
    this.removeEscapeListener()
    this.detachDropdown()
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (!this.isConnected) return
    if (name === 'open') {
      const wasOpen = oldValue !== null
      const isOpen = newValue !== null
      if (isOpen && !wasOpen) this.onOpen()
      else if (!isOpen && wasOpen) this.onClose()
      this.syncOpenState()
    } else if (name === 'options' || name === 'value' || name === 'focused-index') {
      this.syncValueLabel()
      if (this.isOpen()) this.renderDropdown()
    } else {
      this.sync()
    }
  }

  private isOpen(): boolean {
    return this.hasAttribute('open')
  }

  private isSearchable(): boolean {
    return this.hasAttribute('searchable')
  }

  private getOptions(): SelectOption[] {
    return parseOptions(this.getAttribute('options'))
  }

  private getValue(): string | undefined {
    const v = this.getAttribute('value')
    return v === null || v === '' ? undefined : v
  }

  private getFocusedIndex(): number {
    if (this.isSearchable()) return this.internalFocused
    return parseIndex(this.getAttribute('focused-index'), 0)
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
      const idx = Math.max(0, options.findIndex((o) => o.value === value))
      this.dispatchEvent(
        new CustomEvent('nuxy-select-box-open-request', {
          detail: { startIndex: idx },
          bubbles: true,
          composed: true,
        })
      )
    }
  }

  private onOpen(): void {
    const options = this.getOptions()
    const value = this.getValue()
    this.internalFocused = Math.max(0, options.findIndex((o) => o.value === value))
    this.searchQuery = ''
    this.mountDropdown()
    this.addEscapeListener()
  }

  private onClose(): void {
    this.removeEscapeListener()
    this.detachDropdown()
    this.searchQuery = ''
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

  private build(): void {
    if (this.triggerBtn) return

    this.triggerBtn = document.createElement('button')
    this.triggerBtn.type = 'button'
    this.triggerBtn.tabIndex = -1
    this.triggerBtn.className = 'nuxy-select-box__trigger'

    this.valueEl = document.createElement('span')
    this.valueEl.className = 'nuxy-select-box__value'

    const chevron = document.createElement('span')
    chevron.className = 'nuxy-select-box__chevron'
    chevron.textContent = '▾'

    this.triggerBtn.append(this.valueEl, chevron)
    this.appendChild(this.triggerBtn)
  }

  private sync(): void {
    syncHostClasses(this, 'nuxy-select-box')
    this.syncValueLabel()
    this.syncOpenState()
    if (this.isOpen()) this.renderDropdown()
  }

  private syncValueLabel(): void {
    const options = this.getOptions()
    const value = this.getValue()
    const placeholder = this.getAttribute('placeholder') ?? '—'
    const currentLabel = options.find((o) => o.value === value)?.label ?? placeholder
    if (this.valueEl) this.valueEl.textContent = currentLabel
  }

  private syncOpenState(): void {
    const open = this.isOpen()
    if (this.triggerBtn) {
      this.triggerBtn.classList.toggle('nuxy-select-box__trigger--open', open)
      const chevron = this.triggerBtn.querySelector('.nuxy-select-box__chevron')
      chevron?.classList.toggle('nuxy-select-box__chevron--open', open)
    }
  }

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

  private positionDropdown(): void {
    if (!this.dropdown || !this.triggerBtn) return

    this.triggerBtn.scrollIntoView({ block: 'nearest', inline: 'nearest' })

    const r = this.triggerBtn.getBoundingClientRect()
    const w = this.dropdown.offsetWidth || 160
    const h = this.dropdown.offsetHeight || 200
    const gap = 4
    const margin = 8

    let top = r.bottom + gap
    if (top + h > window.innerHeight - margin && r.top - gap - h >= margin) {
      top = r.top - gap - h
    }
    top = Math.max(margin, Math.min(top, window.innerHeight - h - margin))

    let left = r.right - w
    left = Math.max(margin, Math.min(left, window.innerWidth - w - margin))

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
    if (focusedEl) smoothScrollIntoViewIfNeeded(focusedEl)

    this.positionDropdown()
  }
}

if (!customElements.get('nuxy-select-box')) {
  customElements.define('nuxy-select-box', NuxySelectBoxElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-select-box': NuxySelectBoxElement
  }
}
