import './index.css'
import { syncHostClasses } from '../../h.ts'

export interface TabItemData {
  id: string
  label: string
  disabled?: boolean
}

function parseItems(raw: string | null): TabItemData[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as TabItemData[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export class NuxyTabsElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['active', 'items']
  }

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render()
  }

  private collectPanels(): Map<string, HTMLElement> {
    const panels = new Map<string, HTMLElement>()
    for (const el of this.querySelectorAll('[data-tab-content]')) {
      const id = el.getAttribute('data-tab-content')
      if (id) panels.set(id, el as HTMLElement)
    }
    return panels
  }

  private select(id: string, disabled?: boolean): void {
    if (disabled) return
    this.setAttribute('active', id)
    this.dispatchEvent(
      new CustomEvent('nuxy-tabs-change', { detail: { id }, bubbles: true, composed: true })
    )
  }

  private render(): void {
    const items = parseItems(this.getAttribute('items'))
    const active = this.getAttribute('active') ?? items[0]?.id ?? ''
    const extraClass = this.getAttribute('class') ?? ''
    const panels = this.collectPanels()

    syncHostClasses(this, 'nuxy-tabs')

    let list = this.querySelector('.nuxy-tabs__list')
    let content = this.querySelector('.nuxy-tabs__content')

    if (!list) {
      list = document.createElement('div')
      list.className = 'nuxy-tabs__list'
      list.setAttribute('role', 'tablist')
      this.insertBefore(list, this.firstChild)
    }

    if (!content) {
      content = document.createElement('div')
      content.className = 'nuxy-tabs__content'
      content.setAttribute('role', 'tabpanel')
      content.tabIndex = 0
      this.appendChild(content)
    }

    list.replaceChildren()

    for (const item of items) {
      const isActive = item.id === active
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.role = 'tab'
      btn.id = `tab-${item.id}`
      btn.setAttribute('aria-selected', String(isActive))
      btn.setAttribute('aria-controls', `panel-${item.id}`)
      btn.disabled = Boolean(item.disabled)
      btn.className = [
        'nuxy-tabs__trigger',
        isActive ? 'nuxy-tabs__trigger--active' : '',
      ]
        .filter(Boolean)
        .join(' ')
      btn.textContent = item.label
      btn.addEventListener('click', () => this.select(item.id, item.disabled))
      list.appendChild(btn)
    }

    content.id = `panel-${active}`
    content.setAttribute('aria-labelledby', `tab-${active}`)
    content.replaceChildren()

    for (const [id, panel] of panels) {
      panel.hidden = id !== active
      if (id === active) {
        content.appendChild(panel)
      } else if (panel.parentElement === content) {
        this.appendChild(panel)
      }
    }
  }
}

if (!customElements.get('nuxy-tabs')) {
  customElements.define('nuxy-tabs', NuxyTabsElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-tabs': NuxyTabsElement
  }
}
