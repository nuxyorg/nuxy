import { syncHostClasses } from '../../h.ts'
import '../ProgressBar/index.css'

const ICONS: Record<string, string> = {
  info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--syntax-operator)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--syntax-constant)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  error: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--syntax-invalid)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--syntax-green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="20 6 9 17 4 12"/></svg>`,
}

export class NuxyCalloutElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['variant', 'title']
  }

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render()
  }

  private render(): void {
    const variant = this.getAttribute('variant') ?? 'info'
    const title = this.getAttribute('title')
    const extraClass = this.getAttribute('class') ?? ''
    const customIcon = this.querySelector('[slot="icon"]')
    const messageNodes = [...this.childNodes].filter(
      (n) => !(n instanceof Element && (n.slot === 'icon' || n.classList.contains('nuxy-callout__body')))
    )

    syncHostClasses(this, 'nuxy-callout', `nuxy-callout--${variant}`)
    if (variant === 'error') this.setAttribute('role', 'alert')
    else this.removeAttribute('role')

    this.replaceChildren()

    const iconSpan = document.createElement('span')
    iconSpan.className = 'nuxy-callout__icon'
    if (customIcon) {
      iconSpan.appendChild(customIcon.cloneNode(true))
    } else {
      iconSpan.innerHTML = ICONS[variant] ?? ICONS.info!
    }
    this.appendChild(iconSpan)

    const body = document.createElement('div')
    body.className = 'nuxy-callout__body'

    if (title) {
      const titleEl = document.createElement('div')
      titleEl.className = 'nuxy-callout__title'
      titleEl.textContent = title
      body.appendChild(titleEl)
    }

    const messageEl = document.createElement('div')
    messageEl.className = 'nuxy-callout__message'
    messageEl.append(...messageNodes)
    body.appendChild(messageEl)

    this.appendChild(body)
  }
}

if (!customElements.get('nuxy-callout')) {
  customElements.define('nuxy-callout', NuxyCalloutElement)
}
