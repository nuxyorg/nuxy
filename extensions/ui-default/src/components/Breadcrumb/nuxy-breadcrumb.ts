import './index.css'

export interface BreadcrumbCeItem {
  label: string
  href?: string
  index?: number
}

function parseItems(raw: string | null): BreadcrumbCeItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as BreadcrumbCeItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export class NuxyBreadcrumbElement extends HTMLElement {
  private nav: HTMLElement | null = null
  private list: HTMLOListElement | null = null

  static get observedAttributes(): string[] {
    return ['items', 'separator', 'class']
  }

  connectedCallback(): void {
    this.build()
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render()
  }

  private build(): void {
    if (this.nav) return

    this.nav = document.createElement('nav')
    this.nav.setAttribute('aria-label', 'Breadcrumb')
    this.list = document.createElement('ol')
    this.list.className = 'nuxy-breadcrumb'
    this.nav.appendChild(this.list)
    this.appendChild(this.nav)
  }

  private render(): void {
    if (!this.list) return

    const items = parseItems(this.getAttribute('items'))
    const separator = this.getAttribute('separator') ?? '/'
    const extraClass = this.getAttribute('class') ?? ''

    if (this.nav) {
      this.nav.className = ['nuxy-breadcrumb', extraClass].filter(Boolean).join(' ')
    }

    this.list.replaceChildren()

    items.forEach((item, idx) => {
      const isLast = idx === items.length - 1
      const itemIndex = item.index ?? idx

      const li = document.createElement('li')
      li.className = 'nuxy-breadcrumb__item'

      if (idx > 0) {
        const sep = document.createElement('span')
        sep.className = 'nuxy-breadcrumb__sep'
        sep.setAttribute('aria-hidden', 'true')
        sep.textContent = separator
        li.appendChild(sep)
      }

      if (isLast) {
        const current = document.createElement('span')
        current.className = 'nuxy-breadcrumb__current'
        current.setAttribute('aria-current', 'page')
        current.textContent = item.label
        li.appendChild(current)
      } else if (item.href) {
        const link = document.createElement('a')
        link.href = item.href
        link.className = 'nuxy-breadcrumb__link'
        link.textContent = item.label
        li.appendChild(link)
      } else {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'nuxy-breadcrumb__link'
        btn.textContent = item.label
        btn.addEventListener('click', () => {
          this.dispatchEvent(
            new CustomEvent('nuxy-breadcrumb-navigate', {
              detail: { index: itemIndex },
              bubbles: true,
            })
          )
        })
        li.appendChild(btn)
      }

      this.list!.appendChild(li)
    })
  }
}

if (!customElements.get('nuxy-breadcrumb')) {
  customElements.define('nuxy-breadcrumb', NuxyBreadcrumbElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-breadcrumb': NuxyBreadcrumbElement
  }
}
