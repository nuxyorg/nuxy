import {
  LitElement,
  html,
  nothing,
  customElement,
  property,
  type TemplateResult,
} from '@nuxyorg/core'
import type { NuxyToolElement } from '@nuxyorg/core'
import { OllamaController } from './controller.ts'

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
        style="flex:1; min-height:0; overflow-y:auto; display:flex; flex-direction:column; gap:var(--space-2);"
      >
        ${messages.length === 0 && !loading
          ? html`<nuxy-empty-state
              message=${t('empty.message')}
              hint=${t('empty.hint')}
            ></nuxy-empty-state>`
          : messages.map(
              (msg) =>
                html`<nuxy-chat-message role=${msg.role} content=${msg.content}>
                </nuxy-chat-message>`
            )}
        ${loading && messages.at(-1)?.role !== 'assistant'
          ? html`<div style="align-self:flex-start; opacity:0.5; font-size:var(--font-sm);">…</div>`
          : nothing}
      </div>
    `
  }
}
