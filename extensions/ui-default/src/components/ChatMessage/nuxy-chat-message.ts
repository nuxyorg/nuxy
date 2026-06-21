import { LitElement, html, css, customElement, property } from '@nuxyorg/core'
import type { TemplateResult } from '@nuxyorg/core'
import '../MarkdownText/nuxy-markdown-text.ts'
import '../Spinner/nuxy-spinner.ts'

const ROLE_LABELS: Record<string, string> = {
  user: 'You',
  assistant: 'Assistant',
}

@customElement('nuxy-chat-message')
export class NuxyChatMessageElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      max-width: 80%;
    }

    :host([role='user']) {
      align-self: flex-end;
      align-items: flex-end;
    }

    :host([role='assistant']) {
      align-self: flex-start;
      align-items: flex-start;
    }

    .nuxy-chat-message__bubble {
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-lg);
      font-size: var(--font-sm);
      line-height: 1.5;
      word-break: break-word;
    }

    :host([role='user']) .nuxy-chat-message__bubble {
      background: var(--surface-accent-subtle, rgba(120, 80, 255, 0.18));
      color: var(--text-primary, rgba(255, 255, 255, 0.92));
    }

    :host([role='assistant']) .nuxy-chat-message__bubble {
      background: var(--surface-overlay, rgba(20, 20, 20, 0.65));
      color: var(--text-primary, rgba(255, 255, 255, 0.92));
    }

    .nuxy-chat-message__role {
      font-size: var(--font-xs);
      color: var(--text-muted, rgba(255, 255, 255, 0.4));
      padding: 0 var(--space-1);
    }
  `

  @property({ type: String, reflect: true })
  declare role: string
  @property({ type: String })
  declare content: string
  @property({ type: Boolean })
  declare loading: boolean

  render(): TemplateResult {
    const isThinking = this.role === 'assistant' && this.loading && !this.content
    return html`
      <div class="nuxy-chat-message__bubble">
        ${isThinking
          ? html`<nuxy-spinner size="sm"></nuxy-spinner>`
          : this.role === 'assistant'
            ? html`<nuxy-markdown-text content=${this.content}></nuxy-markdown-text>`
            : this.content}
      </div>
      <div class="nuxy-chat-message__role">${ROLE_LABELS[this.role] ?? this.role}</div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-chat-message': NuxyChatMessageElement
  }
}
