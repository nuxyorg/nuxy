import '../ProgressBar/index.css'

const SIZES: Record<string, number> = { sm: 16, md: 24, lg: 36 }

function resolveSize(raw: string | null): number {
  if (!raw) return SIZES.md
  if (raw in SIZES) return SIZES[raw]!
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : SIZES.md
}

export class NuxySpinnerElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['size']
  }

  connectedCallback(): void {
    this.classList.add('nuxy-spinner')
    if (!this.hasAttribute('role')) this.setAttribute('role', 'status')
    if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', 'Loading…')
    this.render()
  }

  attributeChangedCallback(name: string): void {
    if (this.isConnected && name === 'size') this.render()
  }

  private render(): void {
    const px = resolveSize(this.getAttribute('size'))

    const r = (px / 2) * 0.7
    const circumference = 2 * Math.PI * r
    const strokeWidth = px * 0.1

    this.innerHTML = `<svg class="nuxy-spinner__svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}" fill="none" aria-hidden="true">
      <circle class="nuxy-spinner__circle" cx="${px / 2}" cy="${px / 2}" r="${r}" stroke-width="${strokeWidth}" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference * 0.25}" />
    </svg>`
  }
}

export function registerNuxySpinner(): void {
  if (!customElements.get('nuxy-spinner')) {
    customElements.define('nuxy-spinner', NuxySpinnerElement)
  }
}

registerNuxySpinner()
