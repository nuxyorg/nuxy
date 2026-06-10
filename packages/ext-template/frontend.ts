import { LitElement, html, css, nothing, customElement, property } from '@nuxy/core'
import type { NuxyToolElement, TemplateResult } from '@nuxy/core'

@customElement('nuxy-tool-my-extension')
export class NuxyToolMyExtensionElement extends LitElement implements NuxyToolElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      padding: var(--space-4);
      gap: var(--space-3);
      color: var(--text);
    }
  `

  @property({ type: String })
  declare committedQuery: string
  @property({ type: String })
  declare extensionId: string

  private _query = ''
  private _pingResult: string | null = null

  get query(): string {
    return this._query
  }

  set query(value: string) {
    const next = value ?? ''
    if (this._query === next) return
    this._query = next
    this.requestUpdate()
  }

  connectedCallback(): void {
    super.connectedCallback()
    this._ping()
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
  }

  private async _ping(): Promise<void> {
    try {
      const res = await window.core.ipc.invoke(this.extensionId, 'ping', undefined)
      this._pingResult = (res as { ok: boolean }).ok ? 'Backend connected' : 'Unexpected response'
    } catch {
      this._pingResult = 'Backend unreachable'
    }
    this.requestUpdate()
  }

  render(): TemplateResult | typeof nothing {
    return html`
      <nuxy-section-header label="My Extension"></nuxy-section-header>
      <nuxy-list>
        <nuxy-list-item>
          <nuxy-list-item-body>
            <nuxy-list-item-text>Status</nuxy-list-item-text>
            <nuxy-list-item-meta>${this._pingResult ?? 'Checking…'}</nuxy-list-item-meta>
          </nuxy-list-item-body>
        </nuxy-list-item>
        ${this._query
          ? html`
              <nuxy-list-item>
                <nuxy-list-item-body>
                  <nuxy-list-item-text>Query</nuxy-list-item-text>
                  <nuxy-list-item-meta>${this._query}</nuxy-list-item-meta>
                </nuxy-list-item-body>
              </nuxy-list-item>
            `
          : nothing}
      </nuxy-list>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-tool-my-extension': NuxyToolMyExtensionElement
  }
}
