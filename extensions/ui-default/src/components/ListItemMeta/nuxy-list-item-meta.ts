import { LitElement, html, css, customElement } from '@nuxyorg/core'
import type { TemplateResult } from '@nuxyorg/core'

@customElement('nuxy-list-item-meta')
export class NuxyListItemMetaElement extends LitElement {
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

  render(): TemplateResult {
    return html`<span class="nuxy-list-item-meta__text"><slot></slot></span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-list-item-meta': NuxyListItemMetaElement
  }
}
