import './index.css'
import { syncHostClasses } from '../../h.ts'

export class NuxyDropdownMenuElement extends HTMLElement {
  private triggerSlot: HTMLSpanElement | null = null
  private menuEl: HTMLDivElement | null = null
  private isOpen = false
  private outsideHandler: ((e: MouseEvent) => void) | null = null
  private observer: MutationObserver | null = null

  static get observedAttributes(): string[] {
    return ['align']
  }

  connectedCallback(): void {
    this.build()
    this.reparentChildren()
    this.sync()
    this.triggerSlot?.addEventListener('click', this.onTriggerClick)
    this.observer = new MutationObserver(() => this.reparentChildren())
    this.observer.observe(this, { childList: true, subtree: false })
  }

  disconnectedCallback(): void {
    this.triggerSlot?.removeEventListener('click', this.onTriggerClick)
    this.removeOutsideListener()
    this.observer?.disconnect()
    this.observer = null
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private onTriggerClick = (): void => {
    this.setOpen(!this.isOpen)
  }

  private setOpen(open: boolean): void {
    this.isOpen = open
    this.menuEl?.classList.toggle('nuxy-dropdown-menu--open', open)
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

  private build(): void {
    if (this.triggerSlot) return

    this.triggerSlot = document.createElement('span')
    this.menuEl = document.createElement('div')
    this.menuEl.className = 'nuxy-dropdown-menu'

    this.append(this.triggerSlot, this.menuEl)
  }

  private reparentChildren(): void {
    const triggerSource = this.querySelector(':scope > [data-trigger]')
    if (triggerSource && this.triggerSlot && triggerSource.parentElement !== this.triggerSlot) {
      this.triggerSlot.appendChild(triggerSource)
    }

    if (!this.menuEl) return

    for (const child of Array.from(this.children)) {
      if (child === this.triggerSlot || child === this.menuEl) continue
      if (child.parentElement !== this.menuEl) {
        this.menuEl.appendChild(child)
      }
    }
  }

  private sync(): void {
    syncHostClasses(this, 'nuxy-dropdown-wrapper')

    const align = this.getAttribute('align') ?? 'right'
    if (this.menuEl) {
      this.menuEl.classList.toggle('nuxy-dropdown-menu--left', align === 'left')
      this.menuEl.classList.toggle('nuxy-dropdown-menu--open', this.isOpen)
    }

    this.reparentChildren()
  }
}

export class NuxyDropdownItemElement extends HTMLElement {
  private button: HTMLButtonElement | null = null

  static get observedAttributes(): string[] {
    return ['variant', 'disabled']
  }

  private observer: MutationObserver | null = null

  connectedCallback(): void {
    this.build()
    this.sync()
    this.observer = new MutationObserver(() => this.sync())
    this.observer.observe(this, { childList: true, subtree: false })
  }

  disconnectedCallback(): void {
    this.observer?.disconnect()
    this.observer = null
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private build(): void {
    if (this.button) return

    this.button = document.createElement('button')
    this.button.type = 'button'

    const nodes: Node[] = []
    for (const child of this.childNodes) nodes.push(child)
    for (const node of nodes) this.button.appendChild(node)

    this.appendChild(this.button)
  }

  private sync(): void {
    if (!this.button) return

    while (this.firstChild && this.firstChild !== this.button) {
      this.button.appendChild(this.firstChild)
    }

    const variant = this.getAttribute('variant') ?? 'default'
    const extraClass = this.getAttribute('class') ?? ''
    this.button.className = [
      'nuxy-dropdown-item',
      variant === 'danger' ? 'nuxy-dropdown-item--danger' : '',
      extraClass,
    ]
      .filter(Boolean)
      .join(' ')

    this.button.disabled = this.hasAttribute('disabled')
  }
}

export class NuxyDropdownDividerElement extends HTMLElement {
  connectedCallback(): void {
    this.className = 'nuxy-dropdown-divider'
    this.setAttribute('role', 'separator')
  }
}

export class NuxyDropdownHeaderElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return []
  }

  connectedCallback(): void {
    this.sync()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private sync(): void {
    syncHostClasses(this, 'nuxy-dropdown-header')
  }
}

if (!customElements.get('nuxy-dropdown-menu')) {
  customElements.define('nuxy-dropdown-menu', NuxyDropdownMenuElement)
}
if (!customElements.get('nuxy-dropdown-item')) {
  customElements.define('nuxy-dropdown-item', NuxyDropdownItemElement)
}
if (!customElements.get('nuxy-dropdown-divider')) {
  customElements.define('nuxy-dropdown-divider', NuxyDropdownDividerElement)
}
if (!customElements.get('nuxy-dropdown-header')) {
  customElements.define('nuxy-dropdown-header', NuxyDropdownHeaderElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-dropdown-menu': NuxyDropdownMenuElement
    'nuxy-dropdown-item': NuxyDropdownItemElement
    'nuxy-dropdown-divider': NuxyDropdownDividerElement
    'nuxy-dropdown-header': NuxyDropdownHeaderElement
  }
}
