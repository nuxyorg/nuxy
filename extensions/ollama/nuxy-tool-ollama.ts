import {
  LitElement,
  html,
  nothing,
  customElement,
  property,
  query as queryDecorator,
  type PropertyValues,
  type TemplateResult,
} from '@nuxyorg/core'
import type { NuxyToolElement } from '@nuxyorg/core'
import { OllamaController } from './controller.ts'
import { isNearBottom } from './utils/chat-scroll.ts'

@customElement('nuxy-tool-ollama')
export class NuxyToolOllamaElement extends LitElement implements NuxyToolElement {
  protected createRenderRoot(): this {
    return this
  }

  @property({ type: String })
  declare committedQuery: string
  @property({ type: String })
  declare extensionId: string

  private controller: OllamaController | null = null
  private _query = ''
  /** Follows new messages to the bottom until the user scrolls away manually. */
  private _stickToBottom = true
  private _scrollRaf: number | null = null

  @queryDecorator('.nuxy-tool-ollama__messages')
  private declare _messagesEl: HTMLElement | null

  connectedCallback(): void {
    super.connectedCallback()
    this.style.display = 'flex'
    this.style.flexDirection = 'column'
    this.style.height = '100%'
    this.style.gap = 'var(--space-2)'
    this.style.padding = 'var(--space-2)'
    this.style.boxSizing = 'border-box'
    this.controller = new OllamaController(() => this.requestUpdate())
    this.controller.connect()
    if (this._query) this.controller.setQuery(this._query)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.controller?.disconnect()
    this.controller = null
    if (this._scrollRaf !== null) {
      cancelAnimationFrame(this._scrollRaf)
      this._scrollRaf = null
    }
  }

  get query(): string {
    return this._query
  }

  set query(value: string) {
    const next = value ?? ''
    if (this._query === next) return
    this._query = next
    this.controller?.setQuery(next)
  }

  protected updated(changed: PropertyValues): void {
    super.updated(changed)
    if (!this._stickToBottom) return
    // Child message elements (markdown, streaming text) update their own shadow
    // DOM asynchronously, so scrollHeight isn't final yet — defer to next frame.
    if (this._scrollRaf !== null) cancelAnimationFrame(this._scrollRaf)
    this._scrollRaf = requestAnimationFrame(() => {
      this._scrollRaf = null
      if (this._stickToBottom && this._messagesEl) {
        this._messagesEl.scrollTop = this._messagesEl.scrollHeight
      }
    })
  }

  private handleMessagesScroll(e: Event): void {
    this._stickToBottom = isNearBottom(e.currentTarget as HTMLElement)
  }

  render(): TemplateResult | typeof nothing {
    if (!this.controller) return nothing
    const { messages, loading, error, queuedMessage } = this.controller.state
    const t = this.controller.t.t

    return html`
      ${error ? html`<nuxy-alert variant="danger">${error}</nuxy-alert>` : nothing}
      ${queuedMessage
        ? html`<nuxy-alert variant="info"
            >${t('alert.queued', { message: queuedMessage })}</nuxy-alert
          >`
        : nothing}
      <div
        class="nuxy-tool-ollama__messages"
        style="flex:1; min-height:0; overflow-y:auto; display:flex; flex-direction:column; gap:var(--space-2);"
        @scroll=${(e: Event) => this.handleMessagesScroll(e)}
      >
        ${messages.length === 0 && !loading
          ? html`<nuxy-empty-state
              message=${t('empty.message')}
              hint=${t('empty.hint')}
            ></nuxy-empty-state>`
          : messages.map((msg, idx) => {
              const isStreaming = loading && idx === messages.length - 1
              return html`<nuxy-chat-message
                role=${msg.role}
                content=${msg.content}
                model=${msg.model ?? ''}
                ?loading=${isStreaming}
              >
                ${msg.role === 'assistant' && msg.content && !isStreaming
                  ? html`<div slot="actions" style="display:flex; gap:var(--space-1);">
                      <nuxy-icon-button
                        size="sm"
                        variant="ghost"
                        title=${t('actions.copyLastMessage')}
                        aria-label=${t('actions.copyLastMessage')}
                        @click=${() => this.controller?.handleCopyMessage(idx)}
                      >
                        <nuxy-icon name="copy"></nuxy-icon>
                      </nuxy-icon-button>
                      <nuxy-icon-button
                        size="sm"
                        variant="ghost"
                        ?disabled=${loading}
                        title=${t('actions.retry')}
                        aria-label=${t('actions.retry')}
                        @click=${() => this.controller?.handleRetryMessage(idx)}
                      >
                        <nuxy-icon name="refresh"></nuxy-icon>
                      </nuxy-icon-button>
                    </div>`
                  : nothing}
              </nuxy-chat-message>`
            })}
        ${loading && messages.at(-1)?.role !== 'assistant'
          ? html`<div style="align-self:flex-start; opacity:0.5; font-size:var(--font-sm);">…</div>`
          : nothing}
      </div>
    `
  }
}
