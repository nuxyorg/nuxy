import { LitElement, html, css, nothing, customElement, property } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'

const CHECK_ICON: TemplateResult = html`<svg
  width="14"
  height="14"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="3"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <polyline points="20 6 9 17 4 12" />
</svg>`

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

@customElement('nuxy-stepper')
export class NuxyStepperElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      width: 100%;
    }

    .nuxy-step {
      display: flex;
      align-items: center;
      flex: 1;
      position: relative;
    }

    .nuxy-step:last-child {
      flex: none;
    }

    .nuxy-step__indicator {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid var(--syntax-comment);
      background: var(--bg-base);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-sm);
      font-weight: 600;
      color: var(--syntax-comment);
      z-index: 1;
      transition:
        border-color 0.2s ease,
        background 0.2s ease,
        color 0.2s ease;
    }

    .nuxy-step--active .nuxy-step__indicator {
      border-color: var(--syntax-operator);
      color: var(--syntax-operator);
    }

    .nuxy-step--completed .nuxy-step__indicator {
      border-color: var(--syntax-green);
      background: var(--syntax-green);
      color: #000;
    }

    .nuxy-step__label {
      margin-left: var(--space-3);
      font-size: var(--font-sm);
      font-weight: 500;
      color: var(--syntax-comment);
      white-space: nowrap;
    }

    .nuxy-step--active .nuxy-step__label,
    .nuxy-step--completed .nuxy-step__label {
      color: var(--syntax-variable);
    }

    .nuxy-step__line {
      flex: 1;
      height: 2px;
      background: var(--syntax-comment);
      margin: 0 var(--space-4);
      transition: background 0.2s ease;
    }

    .nuxy-step--completed .nuxy-step__line {
      background: var(--syntax-green);
    }
  `

  @property({ type: String }) steps = ''
  @property({ type: Number }) current = 0

  connectedCallback(): void {
    super.connectedCallback()
    this.setAttribute('aria-label', 'Progress Stepper')
  }

  render(): TemplateResult {
    const steps = parseSteps(this.steps)
    const current = this.current

    return html`
      ${steps.map((step, idx) => {
        const isActive = idx === current
        const isCompleted = idx < current
        const isLast = idx === steps.length - 1

        return html`
          <div
            class="nuxy-step ${isActive ? 'nuxy-step--active' : ''} ${isCompleted
              ? 'nuxy-step--completed'
              : ''}"
          >
            <div class="nuxy-step__indicator">${isCompleted ? CHECK_ICON : String(idx + 1)}</div>
            <span class="nuxy-step__label">${step.title}</span>
            ${!isLast ? html`<div class="nuxy-step__line"></div>` : nothing}
          </div>
        `
      })}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-stepper': NuxyStepperElement
  }
}
