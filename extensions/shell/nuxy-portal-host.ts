export class NuxyPortalHostElement extends HTMLElement {
  private _portalElement: HTMLElement | null = null

  connectedCallback(): void {
    if (this._portalElement) this.mountPortal()
  }

  set portalElement(el: HTMLElement | null) {
    this.unmountPortal()
    this._portalElement = el
    if (el && this.isConnected) this.mountPortal()
  }

  get portalElement(): HTMLElement | null {
    return this._portalElement
  }

  private mountPortal(): void {
    const el = this._portalElement
    if (!el || el.parentNode === this) return
    el.classList.add('nuxy-portal-host__content')
    this.appendChild(el)
  }

  private unmountPortal(): void {
    if (this._portalElement?.parentNode === this) {
      this._portalElement.remove()
    }
  }
}

if (!customElements.get('nuxy-portal-host')) {
  customElements.define('nuxy-portal-host', NuxyPortalHostElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-portal-host': NuxyPortalHostElement
  }
}
