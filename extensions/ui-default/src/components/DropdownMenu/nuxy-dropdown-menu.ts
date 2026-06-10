import { LitElement, html, css, nothing, customElement, property, state, ref } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'

@customElement('nuxy-dropdown-menu')
export class NuxyDropdownMenuElement extends LitElement {
  static styles = css`
    :host {
      position: relative;
      display: inline-block;
    }

    .nuxy-dropdown-menu {
      position: absolute;
      top: 100%;
      margin-top: 4px;
      right: 0;
      z-index: var(--z-popover);
      background: var(--bg-base);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-lg);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
      min-width: 180px;
      padding: var(--space-2) 0;
      animation: nuxy-slide-up 0.15s ease;
      transform-origin: top right;
      display: none;
    }

    .nuxy-dropdown-menu--left {
      right: auto;
      left: 0;
      transform-origin: top left;
    }

    .nuxy-dropdown-menu--open {
      display: block;
    }

    @keyframes nuxy-slide-up {
      from {
        transform: translateY(4px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `

  @property({ type: String }) align = 'right'

  @state() private isOpen = false

  private triggerSlotEl: HTMLSpanElement | null = null
  private menuEl: HTMLDivElement | null = null
  private outsideHandler: ((e: MouseEvent) => void) | null = null
  private observer: MutationObserver | null = null

  connectedCallback(): void {
    super.connectedCallback()
    this.observer = new MutationObserver(() => this.reparentChildren())
    this.observer.observe(this, { childList: true, subtree: false })
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeOutsideListener()
    this.observer?.disconnect()
    this.observer = null
  }

  updated(): void {
    this.reparentChildren()
  }

  private onTriggerSlotRef = (el: Element | undefined): void => {
    this.triggerSlotEl = (el as HTMLSpanElement | null | undefined) ?? null
    if (this.triggerSlotEl) {
      this.triggerSlotEl.addEventListener('click', this.onTriggerClick)
    }
    this.reparentChildren()
  }

  private onMenuRef = (el: Element | undefined): void => {
    this.menuEl = (el as HTMLDivElement | null | undefined) ?? null
    this.reparentChildren()
  }

  private onTriggerClick = (): void => {
    this.setOpen(!this.isOpen)
  }

  private setOpen(open: boolean): void {
    this.isOpen = open
    if (open) this.addOutsideListener()
    else this.removeOutsideListener()
  }

  private addOutsideListener(): void {
    if (this.outsideHandler) return
    this.outsideHandler = (e: MouseEvent) => {
      if (!this.contains(e.target as Node)) {
        this.setOpen(false)
      }
    }
    document.addEventListener('mousedown', this.outsideHandler)
  }

  private removeOutsideListener(): void {
    if (!this.outsideHandler) return
    document.removeEventListener('mousedown', this.outsideHandler)
    this.outsideHandler = null
  }

  private reparentChildren(): void {
    if (!this.triggerSlotEl || !this.menuEl) return

    const triggerSource = this.querySelector(':scope > [data-trigger]')
    if (triggerSource && triggerSource.parentElement !== this.triggerSlotEl) {
      this.triggerSlotEl.appendChild(triggerSource)
    }

    for (const child of Array.from(this.children)) {
      if (child === this.triggerSlotEl || child === this.menuEl) continue
      if (child.parentElement !== this.menuEl) {
        this.menuEl.appendChild(child)
      }
    }
  }

  render(): TemplateResult {
    const align = (this.align || this.getAttribute('align')) ?? 'right'
    const menuClass = [
      'nuxy-dropdown-menu',
      align === 'left' ? 'nuxy-dropdown-menu--left' : '',
      this.isOpen ? 'nuxy-dropdown-menu--open' : '',
    ]
      .filter(Boolean)
      .join(' ')

    return html`
      <span ${ref(this.onTriggerSlotRef)}></span>
      <div class=${menuClass} ${ref(this.onMenuRef)}></div>
    `
  }
}

@customElement('nuxy-dropdown-item')
export class NuxyDropdownItemElement extends LitElement {
  static styles = css`
    :host {
      display: contents;
    }

    button {
      width: 100%;
      text-align: left;
      background: transparent;
      border: none;
      padding: var(--space-2) var(--space-4);
      font-size: var(--font-sm);
      color: var(--syntax-variable);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: var(--space-3);
      transition:
        background 0.1s ease,
        color 0.1s ease;
      outline: none;
      font-family: inherit;
    }

    button:hover:not(:disabled),
    button:focus:not(:disabled) {
      background: rgba(255, 255, 255, 0.06);
      color: var(--syntax-operator);
    }

    button.nuxy-dropdown-item--danger {
      color: var(--syntax-invalid);
    }

    button.nuxy-dropdown-item--danger:hover:not(:disabled),
    button.nuxy-dropdown-item--danger:focus:not(:disabled) {
      background: rgba(255, 29, 100, 0.08);
      color: var(--syntax-invalid);
    }

    button:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
  `

  @property({ type: String }) variant = 'default'
  @property({ type: Boolean }) disabled = false

  render(): TemplateResult {
    const variant = (this.variant || this.getAttribute('variant')) ?? 'default'
    const disabled = this.disabled || this.hasAttribute('disabled')
    const extraClass = this.getAttribute('class') ?? ''

    const btnClass = [
      'nuxy-dropdown-item',
      variant === 'danger' ? 'nuxy-dropdown-item--danger' : '',
      extraClass,
    ]
      .filter(Boolean)
      .join(' ')

    return html`
      <button type="button" class=${btnClass} ?disabled=${disabled}>
        <slot></slot>
      </button>
    `
  }
}

@customElement('nuxy-dropdown-divider')
export class NuxyDropdownDividerElement extends LitElement {
  static styles = css`
    :host {
      display: block;
      height: 1px;
      background: rgba(255, 255, 255, 0.06);
      margin: var(--space-1) 0;
    }
  `

  connectedCallback(): void {
    super.connectedCallback()
    this.setAttribute('role', 'separator')
  }

  render() {
    return nothing
  }
}

@customElement('nuxy-dropdown-header')
export class NuxyDropdownHeaderElement extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-size: var(--font-xs);
      color: var(--syntax-comment);
      font-weight: 600;
      padding: var(--space-1) var(--space-4);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  `

  render() {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-dropdown-menu': NuxyDropdownMenuElement
    'nuxy-dropdown-item': NuxyDropdownItemElement
    'nuxy-dropdown-divider': NuxyDropdownDividerElement
    'nuxy-dropdown-header': NuxyDropdownHeaderElement
  }
}
