import '../Spinner/nuxy-spinner.ts'
import { LitElement, html, css, nothing, customElement, property } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'

@customElement('nuxy-loading-state')
export class NuxyLoadingStateElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      gap: var(--space-3);
    }
  `

  @property({ type: String }) message = ''
  @property({ type: String }) size = 'md'
  @property({ type: String, attribute: 'min-height' }) minHeight = '200px'

  connectedCallback(): void {
    super.connectedCallback()
    if (!this.hasAttribute('role')) this.setAttribute('role', 'status')
  }

  updated(): void {
    this.style.minHeight = this.minHeight
    this.setAttribute('aria-label', this.message || 'Loading')
  }

  render(): TemplateResult {
    return html`
      <nuxy-spinner size=${this.size} aria-label=${this.message || 'Loading'}></nuxy-spinner>
      ${this.message
        ? html`<span style="font-size: var(--font-sm); color: var(--text-muted); opacity: 0.75;"
            >${this.message}</span
          >`
        : nothing}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-loading-state': NuxyLoadingStateElement
  }
}
