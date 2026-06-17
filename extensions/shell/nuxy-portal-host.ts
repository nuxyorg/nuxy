import { LitElement, html, nothing, customElement, property } from '@nuxyorg/core'

@customElement('nuxy-portal-host')
export class NuxyPortalHostElement extends LitElement {
  protected createRenderRoot(): HTMLElement {
    return this
  }

  @property({ attribute: false })
  declare portalElement: HTMLElement | null

  updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has('portalElement') && this.portalElement) {
      this.portalElement.classList.add('nuxy-portal-host__content')
    }
  }

  render() {
    return this.portalElement ? html`${this.portalElement}` : nothing
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-portal-host': NuxyPortalHostElement
  }
}
