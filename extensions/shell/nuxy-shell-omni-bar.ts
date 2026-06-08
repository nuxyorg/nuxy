import { syncHostClasses } from '../ce-utils.ts'

export class NuxyShellOmniBarElement extends HTMLElement {
  private input: HTMLInputElement | null = null
  private iconEl: HTMLSpanElement | null = null
  private toolNameEl: HTMLSpanElement | null = null
  private toolSepEl: HTMLSpanElement | null = null
  private portalMount: HTMLDivElement | null = null
  private observer: MutationObserver | null = null

  private _searchIconHtml = ''

  static get observedAttributes(): string[] {
    return [
      'query',
      'static',
      'active-tool-name',
      'placeholder',
      'aria-label',
      'disabled',
    ]
  }

  set searchIconHtml(html: string) {
    this._searchIconHtml = html
    if (this.isConnected) this.syncIcon()
  }

  connectedCallback(): void {
    this.build()
    this.reparentPortalChildren()
    this.sync()
    this.observer = new MutationObserver(() => this.reparentPortalChildren())
    this.observer.observe(this, { childList: true })
  }

  disconnectedCallback(): void {
    this.observer?.disconnect()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  get nativeInput(): HTMLInputElement | null {
    return this.input
  }

  private build(): void {
    if (this.input) return

    this.iconEl = document.createElement('span')
    this.iconEl.className = 'nuxy-shell-omni-bar__icon'
    this.iconEl.setAttribute('aria-hidden', 'true')

    const sep1 = document.createElement('span')
    sep1.className = 'nuxy-shell-omni-bar__sep'
    sep1.textContent = '›'

    this.toolNameEl = document.createElement('span')
    this.toolNameEl.className = 'nuxy-shell-omni-bar__tool-name'

    this.toolSepEl = document.createElement('span')
    this.toolSepEl.className = 'nuxy-shell-omni-bar__sep'
    this.toolSepEl.textContent = '›'

    this.input = document.createElement('input')
    this.input.className = 'nuxy-shell-omni-bar__input'
    this.input.autofocus = true

    this.portalMount = document.createElement('div')
    this.portalMount.className = 'nuxy-shell-omni-bar__portal'
    this.portalMount.style.cssText =
      'display:flex;align-items:center;padding-right:var(--space-3);flex-shrink:0'

    this.append(this.iconEl, sep1, this.toolNameEl, this.toolSepEl, this.input, this.portalMount)
  }

  private reparentPortalChildren(): void {
    if (!this.portalMount) return
    const nodes: Node[] = []
    for (const child of this.childNodes) {
      if (
        child === this.iconEl ||
        child === this.toolNameEl ||
        child === this.toolSepEl ||
        child === this.input ||
        child === this.portalMount
      ) {
        continue
      }
      nodes.push(child)
    }
    if (nodes.length) {
      this.portalMount.replaceChildren(...nodes)
      this.portalMount.hidden = false
    }
  }

  private syncIcon(): void {
    const searchIcon = this._searchIconHtml
    if (!this.iconEl) return
    if (searchIcon) {
      this.iconEl.innerHTML = `<span style="display:flex;align-items:center">${searchIcon}</span>`
    } else {
      this.iconEl.innerHTML =
        '<span class="nuxy-shell-omni-bar__icon-placeholder" aria-hidden="true"></span>'
    }
  }

  private sync(): void {
    syncHostClasses(
      this,
      'nuxy-shell-omni-bar',
      this.hasAttribute('static') ? 'nuxy-shell-omni-bar--static' : ''
    )

    this.syncIcon()

    const toolName = this.getAttribute('active-tool-name')
    if (this.toolNameEl) {
      this.toolNameEl.textContent = toolName ?? ''
      this.toolNameEl.hidden = !toolName
    }
    if (this.toolSepEl) {
      this.toolSepEl.hidden = !toolName
    }

    if (this.input) {
      const query = this.getAttribute('query')
      if (query !== null) this.input.value = query
      const placeholder = this.getAttribute('placeholder')
      if (placeholder) this.input.placeholder = placeholder
      else this.input.removeAttribute('placeholder')
      const ariaLabel = this.getAttribute('aria-label')
      if (ariaLabel) this.input.setAttribute('aria-label', ariaLabel)
      this.input.disabled = this.hasAttribute('disabled')
    }
  }
}

if (!customElements.get('nuxy-shell-omni-bar')) {
  customElements.define('nuxy-shell-omni-bar', NuxyShellOmniBarElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-shell-omni-bar': NuxyShellOmniBarElement
  }
}
