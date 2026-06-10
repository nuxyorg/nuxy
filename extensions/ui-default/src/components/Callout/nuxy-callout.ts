import { LitElement, html, css, nothing, customElement, property, state } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'

const ICONS: Record<string, TemplateResult> = {
  info: html`<svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--syntax-operator)"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>`,
  warning: html`<svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--syntax-constant)"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path
      d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
    />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>`,
  error: html`<svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--syntax-invalid)"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>`,
  success: html`<svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--syntax-green)"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="20 6 9 17 4 12" />
  </svg>`,
}

@customElement('nuxy-callout')
export class NuxyCalloutElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      gap: var(--space-3);
      padding: var(--space-4) var(--space-4);
      border-radius: var(--radius-lg);
      border-left: 3px solid transparent;
      background: rgba(255, 255, 255, 0.03);
      font-size: var(--font-md);
      line-height: 1.5;
    }

    :host([variant='info']) {
      border-left-color: var(--syntax-operator);
      background: rgba(42, 192, 255, 0.05);
    }

    :host([variant='warning']) {
      border-left-color: var(--syntax-constant);
      background: rgba(255, 170, 1, 0.05);
    }

    :host([variant='error']) {
      border-left-color: var(--syntax-invalid);
      background: rgba(255, 29, 100, 0.05);
    }

    :host([variant='success']) {
      border-left-color: var(--syntax-green);
      background: rgba(204, 255, 45, 0.04);
    }

    .nuxy-callout__icon {
      flex-shrink: 0;
      margin-top: 1px;
      display: flex;
      align-items: flex-start;
    }

    .nuxy-callout__body {
    }

    .nuxy-callout__title {
      font-weight: 600;
      margin-bottom: var(--space-1);
      color: var(--syntax-variable);
    }

    .nuxy-callout__message {
      color: var(--syntax-comment);
    }
  `

  @property({ type: String, reflect: true }) variant = 'info'
  @property({ type: String }) title = ''

  @state() private _customIconHTML = ''
  @state() private _messageHTML = ''

  connectedCallback(): void {
    // Capture slotted content before Lit replaces it
    const customIcon = this.querySelector('[slot="icon"]')
    const messageNodes = Array.from(this.childNodes).filter(
      (n) =>
        !(
          n instanceof Element &&
          (n.getAttribute('slot') === 'icon' || n.classList.contains('nuxy-callout__body'))
        )
    )
    this._customIconHTML = customIcon ? (customIcon as Element).outerHTML : ''
    const tmp = document.createElement('div')
    for (const node of messageNodes) tmp.appendChild(node.cloneNode(true))
    this._messageHTML = tmp.innerHTML

    super.connectedCallback()
    this.syncRole()
  }

  updated(): void {
    this.syncRole()
  }

  private syncRole(): void {
    if (this.variant === 'error') this.setAttribute('role', 'alert')
    else this.removeAttribute('role')
  }

  render(): TemplateResult {
    const icon = ICONS[this.variant] ?? ICONS.info!

    return html`
      <span class="nuxy-callout__icon">
        ${this._customIconHTML ? html`<span .innerHTML=${this._customIconHTML}></span>` : icon}
      </span>
      <div class="nuxy-callout__body">
        ${this.title ? html`<div class="nuxy-callout__title">${this.title}</div>` : nothing}
        <div class="nuxy-callout__message" .innerHTML=${this._messageHTML}></div>
      </div>
    `
  }
}
