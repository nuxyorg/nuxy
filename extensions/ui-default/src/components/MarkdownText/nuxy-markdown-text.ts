import './index.css'
import { syncHostClasses } from '../../h.ts'
import { renderMarkdownTo } from './render-markdown'

export class NuxyMarkdownTextElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['content', 'class']
  }

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render()
  }

  private getContent(): string {
    const attr = this.getAttribute('content')
    if (attr !== null) return attr
    return this.textContent ?? ''
  }

  private render(): void {
    syncHostClasses(this, 'nuxy-md')
    renderMarkdownTo(this, this.getContent())
  }
}

if (!customElements.get('nuxy-markdown-text')) {
  customElements.define('nuxy-markdown-text', NuxyMarkdownTextElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-markdown-text': NuxyMarkdownTextElement
  }
}
