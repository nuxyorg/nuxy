import './index.css'
import { syncHostClasses } from '../../h.ts'

const OVERFLOW_SIZES: Record<string, { width: number; height: number; fontSize: number }> = {
  xs: { width: 20, height: 20, fontSize: 9 },
  sm: { width: 28, height: 28, fontSize: 11 },
  md: { width: 36, height: 36, fontSize: 12 },
  lg: { width: 48, height: 48, fontSize: 14 },
  xl: { width: 64, height: 64, fontSize: 16 },
}

export class NuxyAvatarGroupElement extends HTMLElement {
  private overflowEl: HTMLSpanElement | null = null

  static get observedAttributes(): string[] {
    return ['max', 'size']
  }

  connectedCallback(): void {
    this.classList.add('nuxy-avatar-group')
    this.sync()
    this.observer.observe(this, { childList: true })
  }

  disconnectedCallback(): void {
    this.observer.disconnect()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private observer = new MutationObserver(() => {
    if (this.isConnected) this.sync()
  })

  private getAvatars(): HTMLElement[] {
    return Array.from(this.children).filter(
      (el): el is HTMLElement => el.tagName === 'NUXY-AVATAR'
    )
  }

  private sync(): void {
    const max = Number(this.getAttribute('max') ?? '5')
    const size = this.getAttribute('size') ?? 'md'
    const extraClass = this.getAttribute('class') ?? ''

    syncHostClasses(this, 'nuxy-avatar-group')

    const avatars = this.getAvatars()
    const total = avatars.length
    const visibleCount = Math.min(total, max)
    const overflow = total - visibleCount

    avatars.forEach((avatar, idx) => {
      avatar.setAttribute('size', size)
      avatar.hidden = idx >= visibleCount
      avatar.style.display = idx >= visibleCount ? 'none' : ''
    })

    if (overflow > 0) {
      if (!this.overflowEl) {
        this.overflowEl = document.createElement('span')
        this.overflowEl.className = 'nuxy-avatar-group__overflow'
        this.appendChild(this.overflowEl)
      }
      const style = OVERFLOW_SIZES[size] ?? OVERFLOW_SIZES.md
      this.overflowEl.style.width = `${style.width}px`
      this.overflowEl.style.height = `${style.height}px`
      this.overflowEl.style.fontSize = `${style.fontSize}px`
      this.overflowEl.textContent = `+${overflow}`
      this.overflowEl.title = `${overflow} more`
      this.overflowEl.hidden = false
    } else if (this.overflowEl) {
      this.overflowEl.hidden = true
    }
  }
}

if (!customElements.get('nuxy-avatar-group')) {
  customElements.define('nuxy-avatar-group', NuxyAvatarGroupElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-avatar-group': NuxyAvatarGroupElement
  }
}
