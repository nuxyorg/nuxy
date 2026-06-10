import { LitElement, html, css, customElement, property } from '@nuxy/core'

@customElement('nuxy-scroll-area')
export class NuxyScrollAreaElement extends LitElement {
  @property({ type: String, reflect: true }) axis = 'y'
  @property({ type: String, attribute: 'max-height' }) maxHeight = ''
  @property({ type: String, attribute: 'max-width' }) maxWidth = ''

  static styles = css`
    :host {
      overflow: auto;
      position: relative;
      scrollbar-width: thin;
      scrollbar-color: var(--scrollbar-thumb) transparent;
    }

    :host([axis='y']) {
      overflow-x: hidden;
      overflow-y: auto;
    }

    :host([axis='x']) {
      overflow-y: hidden;
      overflow-x: auto;
    }

    :host::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }

    :host::-webkit-scrollbar-track {
      background: transparent;
    }

    :host::-webkit-scrollbar-thumb {
      background: var(--scrollbar-thumb);
      border-radius: var(--radius-xl);
    }

    :host::-webkit-scrollbar-thumb:hover {
      background: var(--scrollbar-thumb-hover);
    }
  `

  updated(): void {
    if (this.maxHeight) {
      this.style.maxHeight = /^\d+$/.test(this.maxHeight) ? `${this.maxHeight}px` : this.maxHeight
    } else {
      this.style.removeProperty('max-height')
    }
    if (this.maxWidth) {
      this.style.maxWidth = /^\d+$/.test(this.maxWidth) ? `${this.maxWidth}px` : this.maxWidth
    } else {
      this.style.removeProperty('max-width')
    }
  }

  render() {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-scroll-area': NuxyScrollAreaElement
  }
}
