import { LitElement, html, css, nothing, customElement, property } from '@nuxyorg/core'
import type { TemplateResult } from '@nuxyorg/core'

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

@customElement('nuxy-avatar')
export class NuxyAvatarElement extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
      font-weight: 600;
      background: var(--syntax-keyword);
      color: var(--syntax-variable);
      user-select: none;
      position: relative;
    }

    :host([size='xs']) {
      width: 20px;
      height: 20px;
      font-size: 9px;
    }
    :host([size='sm']) {
      width: 28px;
      height: 28px;
      font-size: 11px;
    }
    :host([size='md']) {
      width: 36px;
      height: 36px;
      font-size: var(--font-sm);
    }
    :host([size='lg']) {
      width: 48px;
      height: 48px;
      font-size: var(--font-md);
    }
    :host([size='xl']) {
      width: 64px;
      height: 64px;
      font-size: var(--font-lg);
    }

    :host([variant='square']) {
      border-radius: var(--radius-md);
    }

    .nuxy-avatar__img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .nuxy-avatar__badge {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid var(--bg-base);
    }

    .nuxy-avatar__badge--online {
      background: var(--syntax-green);
    }
    .nuxy-avatar__badge--busy {
      background: var(--syntax-constant);
    }
    .nuxy-avatar__badge--away {
      background: var(--syntax-orange);
    }
    .nuxy-avatar__badge--offline {
      background: var(--syntax-comment);
    }
  `

  @property({ type: String, reflect: true })
  declare src: string
  @property({ type: String, reflect: true })
  declare name: string
  @property({ type: String, reflect: true })
  declare size: string
  @property({ type: String, reflect: true })
  declare variant: string
  @property({ type: String, reflect: true })
  declare status: string

  updated(): void {
    if (this.name) {
      this.title = this.name
    } else {
      this.removeAttribute('title')
    }
  }

  render(): TemplateResult {
    return html`
      ${this.src
        ? html`<img src=${this.src} alt=${this.name || 'Avatar'} class="nuxy-avatar__img" />`
        : html`<span>${getInitials(this.name)}</span>`}
      ${this.status
        ? html`<span
            class="nuxy-avatar__badge nuxy-avatar__badge--${this.status}"
            role="presentation"
          ></span>`
        : nothing}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-avatar': NuxyAvatarElement
  }
}
