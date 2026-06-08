import './index.css'
import { syncHostClasses } from '../../h.ts'

export class NuxySwitchElement extends HTMLElement {
  private input: HTMLInputElement | null = null

  static get observedAttributes(): string[] {
    return ['checked', 'disabled', 'id']
  }

  connectedCallback(): void {
    this.classList.add('nuxy-switch')
    this.build()
    this.sync()
    this.input?.addEventListener('change', this.onNativeChange)
  }

  disconnectedCallback(): void {
    this.input?.removeEventListener('change', this.onNativeChange)
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.sync()
  }

  private onNativeChange = (): void => {
    this.toggleFromInput()
  }

  private build(): void {
    if (this.input) return

    const id = this.getAttribute('id')
    this.input = document.createElement('input')
    this.input.type = 'checkbox'
    this.input.role = 'switch'
    this.input.className = 'nuxy-switch__input'
    if (id) this.input.id = id

    const track = document.createElement('span')
    track.className = 'nuxy-switch__track'
    track.setAttribute('aria-hidden', 'true')
    track.innerHTML = '<span class="nuxy-switch__thumb"></span>'
    track.addEventListener('click', (e) => {
      e.preventDefault()
      this.toggle()
    })

    const labelSlot = document.createElement('span')
    labelSlot.className = 'nuxy-switch__label'
    while (this.firstChild) {
      labelSlot.appendChild(this.firstChild)
    }

    this.append(this.input, track, labelSlot)
  }

  private sync(): void {
    const checked = this.hasAttribute('checked')
    const disabled = this.hasAttribute('disabled')
    const extraClass = this.getAttribute('class') ?? ''

    syncHostClasses(this, 'nuxy-switch', checked ? 'nuxy-switch--checked' : '', disabled ? 'nuxy-switch--disabled' : '')

    if (this.input) {
      this.input.checked = checked
      this.input.disabled = disabled
      this.input.setAttribute('aria-checked', String(checked))
    }
  }

  private toggle(): void {
    if (this.hasAttribute('disabled')) return
    const next = !this.hasAttribute('checked')
    if (next) this.setAttribute('checked', '')
    else this.removeAttribute('checked')
    this.sync()
    this.dispatchEvent(
      new CustomEvent('nuxy-switch-change', { detail: { checked: next }, bubbles: true })
    )
  }

  private toggleFromInput(): void {
    if (this.hasAttribute('disabled')) return
    const next = Boolean(this.input?.checked)
    if (next) this.setAttribute('checked', '')
    else this.removeAttribute('checked')
    this.sync()
    this.dispatchEvent(
      new CustomEvent('nuxy-switch-change', { detail: { checked: next }, bubbles: true })
    )
  }
}

if (!customElements.get('nuxy-switch')) {
  customElements.define('nuxy-switch', NuxySwitchElement)
}
