import './index.css'
import { syncHostClasses } from '../../h.ts'

const SEARCH_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`

const CLEAR_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`

const MIRROR_ATTRS = ['placeholder', 'disabled', 'name', 'autocomplete', 'autofocus', 'aria-label', 'tabindex']

export class NuxySearchInputElement extends HTMLElement {
  private field: HTMLInputElement | null = null
  private clearBtn: HTMLButtonElement | null = null

  static get observedAttributes(): string[] {
    return ['value', 'class', ...MIRROR_ATTRS]
  }

  connectedCallback(): void {
    this.build()
    this.sync()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private build(): void {
    if (this.field) return

    const icon = document.createElement('span')
    icon.className = 'nuxy-search-input__icon'
    icon.setAttribute('aria-hidden', 'true')
    icon.innerHTML = SEARCH_ICON

    this.field = document.createElement('input')
    this.field.type = 'text'
    this.field.className = 'nuxy-search-input__field'

    this.clearBtn = document.createElement('button')
    this.clearBtn.type = 'button'
    this.clearBtn.className = 'nuxy-search-input__clear'
    this.clearBtn.setAttribute('aria-label', 'Clear search')
    this.clearBtn.innerHTML = CLEAR_ICON
    this.clearBtn.addEventListener('click', () => this.clear())

    this.append(icon, this.field, this.clearBtn)
  }

  private clear(): void {
    if (!this.field || this.hasAttribute('disabled')) return
    this.field.value = ''
    this.removeAttribute('value')
    this.syncClearVisibility()
    this.field.dispatchEvent(new Event('input', { bubbles: true }))
    this.dispatchEvent(new CustomEvent('nuxy-search-clear', { bubbles: true }))
  }

  private syncClearVisibility(): void {
    if (!this.clearBtn || !this.field) return
    const hasValue = this.field.value.length > 0
    this.clearBtn.hidden = !hasValue
    this.clearBtn.style.display = hasValue ? '' : 'none'
  }

  private sync(): void {
    syncHostClasses(this, 'nuxy-search-input')

    if (this.field) {
      const value = this.getAttribute('value')
      if (value !== null) this.field.value = value

      for (const attr of MIRROR_ATTRS) {
        if (this.hasAttribute(attr)) {
          this.field.setAttribute(attr, this.getAttribute(attr) ?? '')
        } else {
          this.field.removeAttribute(attr)
        }
      }

      this.field.disabled = this.hasAttribute('disabled')
    }

    this.syncClearVisibility()
  }

  get nativeInput(): HTMLInputElement | null {
    return this.field
  }
}

if (!customElements.get('nuxy-search-input')) {
  customElements.define('nuxy-search-input', NuxySearchInputElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-search-input': NuxySearchInputElement
  }
}
