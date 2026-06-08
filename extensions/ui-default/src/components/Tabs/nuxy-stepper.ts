import { syncHostClasses } from '../../h.ts'
import '../Tabs/index.css'

const CHECK_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`

interface StepItem {
  title: string
  description?: string
}

function parseSteps(raw: string | null): StepItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as StepItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export class NuxyStepperElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['steps', 'current']
  }

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render()
  }

  private render(): void {
    const steps = parseSteps(this.getAttribute('steps'))
    const current = Number(this.getAttribute('current') ?? '0')
    const extraClass = this.getAttribute('class') ?? ''

    syncHostClasses(this, 'nuxy-stepper')
    this.setAttribute('aria-label', 'Progress Stepper')
    this.replaceChildren()

    steps.forEach((step, idx) => {
      const isActive = idx === current
      const isCompleted = idx < current
      const isLast = idx === steps.length - 1

      const stepEl = document.createElement('div')
      stepEl.className = [
        'nuxy-step',
        isActive ? 'nuxy-step--active' : '',
        isCompleted ? 'nuxy-step--completed' : '',
      ]
        .filter(Boolean)
        .join(' ')

      const indicator = document.createElement('div')
      indicator.className = 'nuxy-step__indicator'
      indicator.innerHTML = isCompleted ? CHECK_SVG : String(idx + 1)

      const label = document.createElement('span')
      label.className = 'nuxy-step__label'
      label.textContent = step.title

      stepEl.append(indicator, label)
      if (!isLast) {
        const line = document.createElement('div')
        line.className = 'nuxy-step__line'
        stepEl.appendChild(line)
      }

      this.appendChild(stepEl)
    })
  }
}

if (!customElements.get('nuxy-stepper')) {
  customElements.define('nuxy-stepper', NuxyStepperElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-stepper': NuxyStepperElement
  }
}
