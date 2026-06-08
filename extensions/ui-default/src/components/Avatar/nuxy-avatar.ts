import './index.css'
import { syncHostClasses } from '../../h.ts'

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

export class NuxyAvatarElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['src', 'name', 'size', 'variant', 'status']
  }

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render()
  }

  private render(): void {
    const src = this.getAttribute('src')
    const name = this.getAttribute('name') ?? ''
    const size = this.getAttribute('size') ?? 'md'
    const variant = this.getAttribute('variant') ?? 'circle'
    const status = this.getAttribute('status')
    const extraClass = this.getAttribute('class') ?? ''

    syncHostClasses(this, 'nuxy-avatar', `nuxy-avatar--${size}`, variant === 'square' ? 'nuxy-avatar--square' : '')

    if (name) this.title = name
    else this.removeAttribute('title')

    this.replaceChildren()

    if (src) {
      const img = document.createElement('img')
      img.src = src
      img.alt = name || 'Avatar'
      img.className = 'nuxy-avatar__img'
      this.appendChild(img)
    } else {
      const span = document.createElement('span')
      span.textContent = getInitials(name)
      this.appendChild(span)
    }

    if (status) {
      const badge = document.createElement('span')
      badge.className = `nuxy-avatar__badge nuxy-avatar__badge--${status}`
      badge.setAttribute('role', 'presentation')
      this.appendChild(badge)
    }
  }
}

if (!customElements.get('nuxy-avatar')) {
  customElements.define('nuxy-avatar', NuxyAvatarElement)
}
