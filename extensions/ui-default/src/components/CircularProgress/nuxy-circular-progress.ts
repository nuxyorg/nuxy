import './index.css'
import { syncHostClasses } from '../../h.ts'

export class NuxyCircularProgressElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['value', 'size', 'stroke-width', 'show-label']
  }

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render()
  }

  private render(): void {
    const valueRaw = this.getAttribute('value')
    const value = valueRaw != null && valueRaw !== '' ? Number(valueRaw) : undefined
    const indeterminate = value === undefined || Number.isNaN(value)
    const size = Number(this.getAttribute('size') ?? '40') || 40
    const strokeWidth = Number(this.getAttribute('stroke-width') ?? '4') || 4
    const showLabel = this.hasAttribute('show-label')
    const extraClass = this.getAttribute('class') ?? ''

    const r = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * r
    const offset = indeterminate ? 0 : circumference - ((value ?? 0) / 100) * circumference

    syncHostClasses(this, 'nuxy-circular-progress')
    this.style.width = `${size}px`
    this.style.height = `${size}px`
    this.setAttribute('role', 'progressbar')
    if (!indeterminate && value !== undefined) {
      this.setAttribute('aria-valuenow', String(value))
      this.setAttribute('aria-valuemin', '0')
      this.setAttribute('aria-valuemax', '100')
    } else {
      this.removeAttribute('aria-valuenow')
      this.removeAttribute('aria-valuemin')
      this.removeAttribute('aria-valuemax')
    }

    this.innerHTML = `<svg class="nuxy-circular-progress__svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle class="nuxy-circular-progress__track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${strokeWidth}" fill="none"/>
      <circle class="nuxy-circular-progress__fill${indeterminate ? ' nuxy-circular-progress__fill--indeterminate' : ''}" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${strokeWidth}" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" fill="none"/>
    </svg>`

    if (showLabel && !indeterminate && value !== undefined) {
      const label = document.createElement('span')
      label.className = 'nuxy-circular-progress__label'
      label.textContent = `${Math.round(value)}%`
      this.appendChild(label)
    }
  }
}

if (!customElements.get('nuxy-circular-progress')) {
  customElements.define('nuxy-circular-progress', NuxyCircularProgressElement)
}
