import { LitElement, html, css, nothing, customElement, property, state } from '@nuxyorg/core'

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

  @state()
  private overflowCount = 0

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

    this.overflowCount = overflow > 0 ? overflow : 0
  }

  render() {
    const size = this.size
    const style = OVERFLOW_SIZES[size] ?? OVERFLOW_SIZES.md
    return html`
      <slot></slot>
      ${this.overflowCount > 0
        ? html`
            <span
              class="nuxy-avatar-group__overflow"
              style="width: ${style.width}px; height: ${style.height}px; font-size: ${style.fontSize}px"
              title="${this.overflowCount} more"
            >
              +${this.overflowCount}
            </span>
          `
        : nothing}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-avatar-group': NuxyAvatarGroupElement
  }
}
