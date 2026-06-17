import './index.css'
import { LitElement, html, css, customElement, property, nothing } from '@nuxyorg/core'
import type { TemplateResult } from '@nuxyorg/core'
import { mirrorAttrs } from '../../utils/mirror-attrs.ts'

const MIRROR_ATTRS = [
  'disabled',
  'type',
  'name',
  'value',
  'form',
  'formaction',
  'formenctype',
  'formmethod',
  'formnovalidate',
  'formtarget',
  'aria-label',
  'aria-disabled',
  'tabindex',
]

@customElement('nuxy-button')
export class NuxyButtonElement extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
    }

    .nuxy-button {
      padding: var(--space-2) var(--space-4);
      border-radius: var(--radius-lg);
      font-size: var(--font-sm);
      font-weight: 600;
      border: 1px solid var(--syntax-comment);
      transition:
        background-color 200ms,
        border-color 200ms,
        color 200ms,
        transform 200ms;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      cursor: pointer;
      background-color: var(--syntax-comment);
      color: var(--syntax-variable);
    }

    .nuxy-button:active {
      transform: scale(0.95);
    }

    .nuxy-button--default:hover {
      background-color: var(--syntax-keyword);
      border-color: var(--syntax-keyword);
    }

    .nuxy-button--danger {
      background-color: color-mix(in srgb, var(--syntax-invalid) 20%, transparent);
      border-color: color-mix(in srgb, var(--syntax-invalid) 40%, transparent);
      color: var(--syntax-invalid);
    }

    .nuxy-button--danger:hover {
      background-color: color-mix(in srgb, var(--syntax-invalid) 30%, transparent);
    }

    .nuxy-button--success {
      background-color: color-mix(in srgb, var(--syntax-function) 20%, transparent);
      border-color: color-mix(in srgb, var(--syntax-function) 40%, transparent);
      color: var(--syntax-function);
    }

    .nuxy-button--success:hover {
      background-color: color-mix(in srgb, var(--syntax-function) 30%, transparent);
    }

    .nuxy-button--primary {
      background-color: color-mix(in srgb, var(--syntax-operator) 20%, transparent);
      border-color: color-mix(in srgb, var(--syntax-operator) 40%, transparent);
      color: var(--syntax-operator);
    }

    .nuxy-button--primary:hover {
      background-color: color-mix(in srgb, var(--syntax-operator) 30%, transparent);
    }
  `

  @property({ type: String })
  declare variant: string

  private getMirroredAttrs(): Record<string, string | null> {
    return mirrorAttrs(this, MIRROR_ATTRS)
  }

  render(): TemplateResult {
    const variant = this.variant
    const className = ['nuxy-button', `nuxy-button--${variant}`].filter(Boolean).join(' ')
    const mirrored = this.getMirroredAttrs()

    return html`
      <button
        class=${className}
        ?disabled=${this.hasAttribute('disabled')}
        type=${mirrored['type'] ?? 'button'}
        name=${mirrored['name'] ?? nothing}
        value=${mirrored['value'] ?? nothing}
        aria-label=${mirrored['aria-label'] ?? nothing}
        aria-disabled=${mirrored['aria-disabled'] ?? nothing}
        tabindex=${mirrored['tabindex'] ?? nothing}
      >
        <slot></slot>
      </button>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-button': NuxyButtonElement
  }
}
