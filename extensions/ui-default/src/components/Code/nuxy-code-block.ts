import './index.css'
import { syncHostClasses } from '../../h.ts'
import '../CopyButton/nuxy-copy-button.ts'
import { highlight } from '../../utils/highlight'

export class NuxyCodeBlockElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['code', 'language', 'show-copy']
  }

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render()
  }

  private render(): void {
    const code = this.getAttribute('code') ?? ''
    const language = (this.getAttribute('language') ?? 'text').toLowerCase()
    const showCopy = this.getAttribute('show-copy') !== 'false'
    const extraClass = this.getAttribute('class') ?? ''

    syncHostClasses(this, 'nuxy-code-block')

    const shouldHighlight = language !== 'text' && language !== 'plain' && language !== ''
    const tokens = shouldHighlight ? highlight(code, language) : null

    this.replaceChildren()

    if (language || showCopy) {
      const header = document.createElement('div')
      header.className = 'nuxy-code-block__header'

      const lang = document.createElement('span')
      lang.className = 'nuxy-code-block__lang'
      lang.textContent = this.getAttribute('language') ?? 'text'
      header.appendChild(lang)

      if (showCopy) {
        const copy = document.createElement('nuxy-copy-button')
        copy.setAttribute('value', code)
        copy.setAttribute('label', 'Copy code')
        copy.className = 'nuxy-code-block__copy'
        header.appendChild(copy)
      }

      this.appendChild(header)
    }

    const pre = document.createElement('pre')
    pre.className = 'nuxy-code-block__pre'
    const codeEl = document.createElement('code')

    if (tokens) {
      for (const tok of tokens) {
        if (tok.type === 'plain') {
          codeEl.appendChild(document.createTextNode(tok.text))
        } else {
          const span = document.createElement('span')
          span.className = `nuxy-hl-${tok.type}`
          span.textContent = tok.text
          codeEl.appendChild(span)
        }
      }
    } else {
      codeEl.textContent = code
    }

    pre.appendChild(codeEl)
    this.appendChild(pre)
  }
}

if (!customElements.get('nuxy-code-block')) {
  customElements.define('nuxy-code-block', NuxyCodeBlockElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-code-block': NuxyCodeBlockElement
  }
}
