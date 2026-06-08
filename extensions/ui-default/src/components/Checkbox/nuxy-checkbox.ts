import './index.css'
import { syncHostClasses } from '../../h.ts'

const CHECKMARK = `<svg class="nuxy-checkbox__checkmark" viewBox="0 0 12 9"><polyline points="1,5 4,8 11,1"/></svg>`

export class NuxyCheckboxElement extends HTMLElement {
  private input: HTMLInputElement | null = null

  static get observedAttributes(): string[] {
    return ['checked', 'disabled', 'id']
  }

  connectedCallback(): void {
    this.classList.add('nuxy-checkbox')
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
    this.input.className = 'nuxy-checkbox__input'
    if (id) this.input.id = id

    const box = document.createElement('span')
    box.className = 'nuxy-checkbox__box'
    box.setAttribute('aria-hidden', 'true')
    box.innerHTML = CHECKMARK
    box.addEventListener('click', (e) => {
      e.preventDefault()
      this.toggle()
    })

    const labelSlot = document.createElement('span')
    labelSlot.className = 'nuxy-checkbox__label'
    while (this.firstChild) {
      labelSlot.appendChild(this.firstChild)
    }

    this.append(this.input, box, labelSlot)
  }

  private sync(): void {
    const checked = this.hasAttribute('checked')
    const disabled = this.hasAttribute('disabled')
    const extraClass = this.getAttribute('class') ?? ''

    syncHostClasses(this, 'nuxy-checkbox', checked ? 'nuxy-checkbox--checked' : '', disabled ? 'nuxy-checkbox--disabled' : '')

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
      new CustomEvent('nuxy-checkbox-change', { detail: { checked: next }, bubbles: true })
    )
  }

  private toggleFromInput(): void {
    if (this.hasAttribute('disabled')) return
    const next = Boolean(this.input?.checked)
    if (next) this.setAttribute('checked', '')
    else this.removeAttribute('checked')
    this.sync()
    this.dispatchEvent(
      new CustomEvent('nuxy-checkbox-change', { detail: { checked: next }, bubbles: true })
    )
  }
}

if (!customElements.get('nuxy-checkbox')) {
  customElements.define('nuxy-checkbox', NuxyCheckboxElement)
}
