import './index.css'
import { syncHostClasses } from '../../h.ts'

export interface RadioGroupOption {
  value: string
  label: string
  disabled?: boolean
}

function parseOptions(raw: string | null): RadioGroupOption[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as RadioGroupOption[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export class NuxyRadioGroupElement extends HTMLElement {
  private groupName = ''

  static get observedAttributes(): string[] {
    return ['options', 'value', 'name', 'orientation', 'disabled']
  }

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render()
  }

  private render(): void {
    const options = parseOptions(this.getAttribute('options'))
    const selected = this.getAttribute('value') ?? ''
    const orientation = this.getAttribute('orientation') ?? 'vertical'
    const disabled = this.hasAttribute('disabled')
    const extraClass = this.getAttribute('class') ?? ''

    this.groupName =
      this.getAttribute('name') ?? `nuxy-radio-${Math.random().toString(36).slice(2, 9)}`

    syncHostClasses(this, 'nuxy-radio-group', orientation === 'horizontal' ? 'nuxy-radio-group--horizontal' : '')
    this.setAttribute('role', 'radiogroup')

    this.replaceChildren()

    for (const opt of options) {
      const isChecked = selected === opt.value
      const isDisabled = disabled || Boolean(opt.disabled)

      const label = document.createElement('label')
      label.className = [
        'nuxy-radio',
        isChecked ? 'nuxy-radio--checked' : '',
        isDisabled ? 'nuxy-radio--disabled' : '',
      ]
        .filter(Boolean)
        .join(' ')

      const input = document.createElement('input')
      input.type = 'radio'
      input.className = 'nuxy-radio__input'
      input.name = this.groupName
      input.value = opt.value
      input.checked = isChecked
      input.disabled = isDisabled
      input.setAttribute('aria-checked', String(isChecked))
      input.addEventListener('change', () => this.select(opt.value, opt.disabled))

      const circle = document.createElement('span')
      circle.className = 'nuxy-radio__circle'
      circle.setAttribute('aria-hidden', 'true')
      circle.innerHTML = '<span class="nuxy-radio__dot"></span>'
      circle.addEventListener('click', (e) => {
        e.preventDefault()
        this.select(opt.value, opt.disabled)
      })

      const text = document.createElement('span')
      text.textContent = opt.label

      label.append(input, circle, text)
      this.appendChild(label)
    }
  }

  private select(optValue: string, optDisabled?: boolean): void {
    if (this.hasAttribute('disabled') || optDisabled) return
    this.setAttribute('value', optValue)
    this.render()
    this.dispatchEvent(
      new CustomEvent('nuxy-radio-group-change', { detail: { value: optValue }, bubbles: true })
    )
  }
}

if (!customElements.get('nuxy-radio-group')) {
  customElements.define('nuxy-radio-group', NuxyRadioGroupElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-radio-group': NuxyRadioGroupElement
  }
}
