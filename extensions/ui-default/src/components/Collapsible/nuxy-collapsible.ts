import { LitElement, html, css, customElement, state, type TemplateResult } from '@nuxy/core'

const CHEVRON_SVG = html`<svg
  width="14"
  height="14"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <polyline points="6 9 12 15 18 9" />
</svg>`

@customElement('nuxy-collapsible')
export class NuxyCollapsibleElement extends LitElement {
  static styles = css`
    :host {
    }

    :host([data-sep]) {
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .nuxy-collapsible__trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      background: transparent;
      border: none;
      color: var(--syntax-variable);
      font-size: var(--font-md);
      font-family: inherit;
      cursor: pointer;
      padding: var(--space-3) 0;
      text-align: left;
      gap: var(--space-3);
    }

    .nuxy-collapsible__trigger:hover {
      color: var(--syntax-operator);
    }

    .nuxy-collapsible__chevron {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      opacity: 0.5;
      transition: transform 0.2s ease;
    }

    :host([open]) .nuxy-collapsible__chevron {
      transform: rotate(180deg);
    }

    .nuxy-collapsible__content {
      overflow: hidden;
      max-height: 0;
      transition: max-height 0.2s ease;
    }

    :host([open]) .nuxy-collapsible__content {
      max-height: 9999px;
    }
  `

  @state()
  declare private isOpen: boolean

  connectedCallback(): void {
    super.connectedCallback()
    if (this.hasAttribute('default-open') || this.hasAttribute('open')) {
      this.isOpen = true
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
  }

  private onToggle = (): void => {
    this.isOpen = !this.isOpen
    if (this.isOpen) this.setAttribute('open', '')
    else this.removeAttribute('open')
    this.dispatchEvent(
      new CustomEvent('nuxy-collapsible-change', {
        detail: { open: this.isOpen },
        bubbles: true,
        composed: true,
      })
    )
  }

  render(): TemplateResult {
    return html`
      <button
        type="button"
        class="nuxy-collapsible__trigger"
        aria-expanded=${String(this.isOpen)}
        @click=${this.onToggle}
      >
        <slot name="trigger"></slot>
        <span class="nuxy-collapsible__chevron" aria-hidden="true"> ${CHEVRON_SVG} </span>
      </button>
      <div class="nuxy-collapsible__content" aria-hidden=${String(!this.isOpen)}>
        <slot name="content"></slot>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-collapsible': NuxyCollapsibleElement
  }
}
