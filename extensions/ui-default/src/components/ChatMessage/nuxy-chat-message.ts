import './index.css'
import { syncHostClasses } from '../../h.ts'
import '../MarkdownText/nuxy-markdown-text.ts'

const ROLE_LABELS: Record<string, string> = {
  user: 'You',
  assistant: 'Assistant',
}

export class NuxyChatMessageElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['role', 'content']
  }

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render()
  }

  private render(): void {
    const role = this.getAttribute('role') ?? 'assistant'
    const content = this.getAttribute('content') ?? ''
    const extraClass = this.getAttribute('class') ?? ''

    syncHostClasses(this, 'nuxy-chat-message', `nuxy-chat-message--${role}`)

    this.replaceChildren()

    const bubble = document.createElement('div')
    bubble.className = 'nuxy-chat-message__bubble'

    if (role === 'assistant') {
      const md = document.createElement('nuxy-markdown-text')
      md.setAttribute('content', content)
      bubble.appendChild(md)
    } else {
      bubble.textContent = content
    }

    const roleEl = document.createElement('div')
    roleEl.className = 'nuxy-chat-message__role'
    roleEl.textContent = ROLE_LABELS[role] ?? role

    this.append(bubble, roleEl)
  }
}

if (!customElements.get('nuxy-chat-message')) {
  customElements.define('nuxy-chat-message', NuxyChatMessageElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-chat-message': NuxyChatMessageElement
  }
}
