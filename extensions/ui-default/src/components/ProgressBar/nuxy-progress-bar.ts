import './index.css'
import { syncHostClasses } from '../../h.ts'

function parseNum(attr: string | null, fallback?: number): number | undefined {
  if (attr === null || attr === '') return fallback
  const n = Number(attr)
  return Number.isFinite(n) ? n : fallback
}

export class NuxyProgressBarElement extends HTMLElement {
  private headerEl: HTMLDivElement | null = null
  private labelEl: HTMLSpanElement | null = null
  private valueEl: HTMLSpanElement | null = null
  private trackEl: HTMLDivElement | null = null
  private fillEl: HTMLDivElement | null = null

  static get observedAttributes(): string[] {
    return ['value', 'max', 'size', 'label', 'show-value']
  }

  connectedCallback(): void {
    this.build()
    this.sync()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private build(): void {
    if (this.trackEl) return

    this.headerEl = document.createElement('div')
    this.headerEl.className = 'nuxy-progress__header'
    this.labelEl = document.createElement('span')
    this.valueEl = document.createElement('span')
    this.headerEl.append(this.labelEl, this.valueEl)

    this.trackEl = document.createElement('div')
    this.trackEl.className = 'nuxy-progress__track'

    this.fillEl = document.createElement('div')
    this.fillEl.className = 'nuxy-progress__fill'
    this.trackEl.appendChild(this.fillEl)

    this.append(this.headerEl, this.trackEl)
  }

  private sync(): void {
    const extraClass = this.getAttribute('class') ?? ''
    const indeterminate = !this.hasAttribute('value')
    const max = parseNum(this.getAttribute('max'), 100) ?? 100
    const rawValue = parseNum(this.getAttribute('value'), 0) ?? 0
    const pct = indeterminate ? 0 : Math.min(100, Math.max(0, (rawValue / max) * 100))
    const size = this.getAttribute('size') ?? 'md'
    const label = this.getAttribute('label')
    const showValue = this.hasAttribute('show-value')

    syncHostClasses(this, 'nuxy-progress')
    this.setAttribute('role', 'progressbar')
    if (indeterminate) {
      this.removeAttribute('aria-valuenow')
    } else {
      this.setAttribute('aria-valuenow', String(Math.round(pct)))
    }
    this.setAttribute('aria-valuemin', '0')
    this.setAttribute('aria-valuemax', '100')

    if (this.headerEl) {
      const showHeader = Boolean(label) || (showValue && !indeterminate)
      this.headerEl.hidden = !showHeader
    }

    if (this.labelEl) {
      if (label) {
        this.labelEl.textContent = label
        this.labelEl.hidden = false
      } else {
        this.labelEl.textContent = ''
        this.labelEl.hidden = true
      }
    }

    if (this.valueEl) {
      if (showValue && !indeterminate) {
        this.valueEl.textContent = `${Math.round(pct)}%`
        this.valueEl.hidden = false
      } else {
        this.valueEl.textContent = ''
        this.valueEl.hidden = true
      }
    }

    if (this.trackEl) {
      this.trackEl.className = `nuxy-progress__track nuxy-progress__track--${size}`
    }

    if (this.fillEl) {
      this.fillEl.className = [
        'nuxy-progress__fill',
        indeterminate ? 'nuxy-progress__fill--indeterminate' : '',
      ]
        .filter(Boolean)
        .join(' ')
      if (indeterminate) {
        this.fillEl.style.width = ''
      } else {
        this.fillEl.style.width = `${pct}%`
      }
    }
  }
}

if (!customElements.get('nuxy-progress-bar')) {
  customElements.define('nuxy-progress-bar', NuxyProgressBarElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-progress-bar': NuxyProgressBarElement
  }
}
