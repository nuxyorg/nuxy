import { syncHostClasses } from '../ce-utils.ts'

export class NuxyShellSkeletonListElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['rows']
  }

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render()
  }

  private render(): void {
    const rows = Math.max(1, Number(this.getAttribute('rows') ?? '2'))
    syncHostClasses(this, 'nuxy-skeleton-list')
    this.replaceChildren()

    for (let i = 0; i < rows; i++) {
      const row = document.createElement('div')
      row.className = 'nuxy-skeleton-list-item nuxy-shimmer-bg'
      if (i === rows - 1 && rows > 1) row.style.width = '80%'
      this.appendChild(row)
    }
  }
}

if (!customElements.get('nuxy-shell-skeleton-list')) {
  customElements.define('nuxy-shell-skeleton-list', NuxyShellSkeletonListElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-shell-skeleton-list': NuxyShellSkeletonListElement
  }
}
