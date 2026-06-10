import { LitElement, html, css, customElement, unsafeHTML } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'

@customElement('nuxy-list-item-meta')
export class NuxyListItemMetaElement extends LitElement {
  private _innerContent = ''

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .nuxy-list-item-meta__text {
      font-size: var(--font-xs);
      color: var(--syntax-keyword);
    }
  `

  connectedCallback(): void {
    // Capture children before Lit renders
    this._innerContent = this.innerHTML
    super.connectedCallback()
  }

  render(): TemplateResult {
    return html`<span class="nuxy-list-item-meta__text">${unsafeHTML(this._innerContent)}</span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-list-item-meta': NuxyListItemMetaElement
  }
}
