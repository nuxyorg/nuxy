import {
  LitElement,
  html,
  css,
  nothing,
  customElement,
  property,
  type TemplateResult,
} from '@nuxyorg/core'
import type { NuxyToolElement } from '@nuxyorg/core'
import type { TranslateFn } from '@nuxyorg/extension-sdk'
import { DownloadManagerController } from './controller.ts'
import { formatBytes, formatSpeed } from './utils/format.ts'
import type { DownloadItem, DownloadStatus } from './types.ts'

const TAG = 'nuxy-tool-download-manager'

@customElement(TAG)
export class NuxyToolDownloadManagerElement extends LitElement implements NuxyToolElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
  `

  @property({ type: String })
  declare committedQuery: string
  @property({ type: String })
  declare extensionId: string

  private controller: DownloadManagerController | null = null
  private _query = ''
  private _deeplinkApplied = false

  get query(): string {
    return this._query
  }

  set query(value: string) {
    this._query = value ?? ''
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.controller = new DownloadManagerController(() => this.requestUpdate())
    this.controller.connect()
    if (this.committedQuery) this.applyDeeplink(this.committedQuery)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.controller?.disconnect()
    this.controller = null
  }

  /**
   * Deeplink round-trip: `nuxy://download-manager/add?url=...` arrives as
   * `committedQuery = "add?url=..."`. Retries on every update cycle until
   * `applyDeeplinkPath` reports success, mirroring SettingsController's
   * approach — `applyDeeplinkPath` is itself idempotent for the same path.
   */
  protected updated(): void {
    if (this.committedQuery && this.controller && !this._deeplinkApplied) {
      this.applyDeeplink(this.committedQuery)
    }
  }

  private applyDeeplink(path: string): void {
    void this.controller?.applyDeeplinkPath(path).then((applied) => {
      if (applied) this._deeplinkApplied = true
    })
  }

  private panelStyle(): string {
    return [
      'display:flex',
      'flex-direction:column',
      'gap:var(--space-4)',
      'padding:var(--space-5)',
      'flex:1',
      'min-height:0',
      'overflow:auto',
    ].join(';')
  }

  render(): TemplateResult | typeof nothing {
    if (!this.controller) return nothing
    const t = this.controller.t.t
    const { items, selectedIndex } = this.controller.state

    if (items.length === 0) {
      return html`
        <div style=${this.panelStyle()}>
          <nuxy-section-header label=${t('title')}></nuxy-section-header>
          <nuxy-empty-state
            message=${t('empty.message')}
            hint=${t('empty.hint')}
          ></nuxy-empty-state>
        </div>
      `
    }

    return html`
      <div style=${this.panelStyle()}>
        <nuxy-section-header label=${t('title')}></nuxy-section-header>
        <nuxy-list active-index=${selectedIndex}>
          ${items.map((item, i) => this.renderItem(item, i, i === selectedIndex, t))}
        </nuxy-list>
      </div>
    `
  }

  private statusLabel(status: DownloadStatus, t: TranslateFn): string {
    return t(`status.${status}`)
  }

  private renderItem(
    item: DownloadItem,
    index: number,
    active: boolean,
    t: TranslateFn
  ): TemplateResult {
    const meta =
      item.status === 'downloading'
        ? `${this.statusLabel(item.status, t)} — ${formatBytes(item.bytesDownloaded)} (${formatSpeed(item.speedBps)})`
        : item.status === 'failed' && item.error
          ? `${this.statusLabel(item.status, t)} — ${item.error}`
          : this.statusLabel(item.status, t)

    return html`
      <nuxy-list-item ?active=${active} @click=${() => this.controller?.setSelectedIndex(index)}>
        <nuxy-list-item-body>
          <nuxy-list-item-text ?active=${active}>${item.fileName}</nuxy-list-item-text>
          <nuxy-list-item-meta>${meta}</nuxy-list-item-meta>
        </nuxy-list-item-body>
      </nuxy-list-item>
    `
  }
}
