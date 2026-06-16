import { LitElement, html, css, customElement, property } from '@nuxyorg/core'

const OVERFLOW_SIZES: Record<string, { width: number; height: number; fontSize: number }> = {
  xs: { width: 20, height: 20, fontSize: 9 },
  sm: { width: 28, height: 28, fontSize: 11 },
  md: { width: 36, height: 36, fontSize: 12 },
  lg: { width: 48, height: 48, fontSize: 14 },
  xl: { width: 64, height: 64, fontSize: 16 },
}

@customElement('nuxy-avatar-group')
export class NuxyAvatarGroupElement extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
    }

    ::slotted(nuxy-avatar + nuxy-avatar) {
      margin-left: -8px;
      border: 2px solid var(--bg-base);
    }

    .nuxy-avatar-group__overflow {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      color: var(--syntax-comment);
      font-size: var(--font-xs);
      font-weight: 600;
      border: 2px solid var(--bg-base);
      margin-left: -8px;
      flex-shrink: 0;
    }
  `

  @property({ type: Number })
  declare max: number
  @property({ type: String })
  declare size: string

  private overflowEl: HTMLSpanElement | null = null
  private observer = new MutationObserver(() => {
    if (this.isConnected) this.sync()
  })

  connectedCallback(): void {
    super.connectedCallback()
    this.sync()
    this.observer.observe(this, { childList: true })
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.observer.disconnect()
  }

  updated(): void {
    this.sync()
  }

  private getAvatars(): HTMLElement[] {
    return Array.from(this.children).filter((el): el is HTMLElement => el.tagName === 'NUXY-AVATAR')
  }

  private sync(): void {
    const max = this.max
    const size = this.size
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

  render() {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-avatar-group': NuxyAvatarGroupElement
  }
}
