import { LitElement, html, css, customElement, property } from '@nuxy/core'
import { scrollListActiveItem } from '../../hooks/scroll-into-view'

@customElement('nuxy-list')
export class NuxyListElement extends LitElement {
  @property({ type: String, attribute: 'max-height', reflect: true })
  declare maxHeight: string
  @property({ type: Number, attribute: 'active-index' })
  declare activeIndex: number

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
    }

    :host::-webkit-scrollbar {
    }

    :host([max-height='md']) {
      max-height: 320px;
    }
  `

  updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has('activeIndex')) {
      scrollListActiveItem(this, this.activeIndex)
    }
  }

  render() {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-list': NuxyListElement
  }
}
