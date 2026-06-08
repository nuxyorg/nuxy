import './index.css'
import { syncHostClasses } from '../../h.ts'
import { smoothScrollIntoViewIfNeeded } from '../../utils/scroll'

export interface TabBarTab {
  id: string
  label: string
  icon?: string
}

function parseTabs(raw: string | null): TabBarTab[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as TabBarTab[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export class NuxyTabBarElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['tabs', 'active', 'orientation']
  }

  connectedCallback(): void {
    this.render()
    this.scrollActiveIntoView()
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return
    this.render()
    if (name === 'active') {
      this.scrollActiveIntoView()
    }
  }

  private render(): void {
    const tabs = parseTabs(this.getAttribute('tabs'))
    const active = this.getAttribute('active') ?? ''
    const orientation = this.getAttribute('orientation') ?? 'horizontal'
    const extraClass = this.getAttribute('class') ?? ''

    syncHostClasses(this, 'nuxy-tab-bar', `nuxy-tab-bar--${orientation}`)

    this.replaceChildren()

    for (const tab of tabs) {
      const btn = document.createElement('button')
      btn.className = `nuxy-tab ${active === tab.id ? 'nuxy-tab--active' : ''}`
      btn.addEventListener('click', () => this.select(tab.id))

      if (tab.icon) {
        const icon = document.createElement('span')
        icon.className = 'nuxy-tab__icon'
        icon.textContent = tab.icon
        btn.appendChild(icon)
      }

      const label = document.createElement('span')
      label.className = 'nuxy-tab__label'
      label.textContent = tab.label
      btn.appendChild(label)

      this.appendChild(btn)
    }
  }

  private select(id: string): void {
    this.setAttribute('active', id)
    this.render()
    this.scrollActiveIntoView()
    this.dispatchEvent(
      new CustomEvent('nuxy-tab-bar-change', { detail: { id }, bubbles: true })
    )
  }

  private scrollActiveIntoView(): void {
    const activeEl = this.querySelector('.nuxy-tab--active')
    if (activeEl instanceof HTMLElement) {
      smoothScrollIntoViewIfNeeded(activeEl)
    }
  }
}

if (!customElements.get('nuxy-tab-bar')) {
  customElements.define('nuxy-tab-bar', NuxyTabBarElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-tab-bar': NuxyTabBarElement
  }
}
