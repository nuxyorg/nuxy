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
import { QbittorrentController, isPausedState } from './controller.ts'
import { formatBytes, formatEta, formatProgress, formatSpeed } from './utils/format.ts'
import type { TorrentItem, TorrentPendingAction } from './types.ts'

const TAG = 'nuxy-tool-qbittorrent'

@customElement(TAG)
export class NuxyToolQbittorrentElement extends LitElement implements NuxyToolElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .nuxy-qbit-panel {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: auto;
    }

    .nuxy-qbit-progress {
      margin-top: var(--space-1);
    }

    .nuxy-qbit-add-panel {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      padding: var(--space-5);
    }
  `

  @property({ type: String })
  declare committedQuery: string
  @property({ type: String })
  declare extensionId: string

  private controller: QbittorrentController | null = null
  private _query = ''
  private _deeplinkApplied = false

  get query(): string {
    return this._query
  }

  set query(value: string) {
    const next = value ?? ''
    if (this._query === next) return
    this._query = next
    this.controller?.setQuery(next)
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.controller = new QbittorrentController(() => this.requestUpdate())
    this.controller.connect()
    if (this._query) this.controller.setQuery(this._query)
    if (this.committedQuery) this.applyDeeplink(this.committedQuery)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.controller?.disconnect()
    this.controller = null
  }

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

  render(): TemplateResult | typeof nothing {
    if (!this.controller) return nothing
    const t = this.controller.t.t
    const { error, query } = this.controller.state

    if (this.controller.isAddMode) {
      return html`<div class="nuxy-qbit-panel">${this.renderAddPanel(t)}</div>`
    }

    if (error) {
      return html`<div class="nuxy-qbit-panel">
        <nuxy-alert variant="error">${error}</nuxy-alert>
      </div>`
    }

    const items = this.controller.filteredTorrents
    if (items.length === 0) {
      const hasAny = this.controller.state.torrents.length > 0
      return html`
        <div class="nuxy-qbit-panel">
          <nuxy-empty-state
            message=${query && hasAny ? t('empty.noMatching') : t('empty.message')}
            hint=${query && hasAny ? '' : t('empty.hint')}
          ></nuxy-empty-state>
        </div>
      `
    }

    const { selectedIndex, copiedHash } = this.controller.state

    return html`
      <div class="nuxy-qbit-panel">
        <nuxy-list active-index=${selectedIndex}>
          ${items.map((item, idx) =>
            this.renderItem(item, idx, idx === selectedIndex, copiedHash === item.hash, t)
          )}
        </nuxy-list>
      </div>
    `
  }

  private renderAddPanel(t: (key: string) => string): TemplateResult {
    const { query, adding, addError } = this.controller!.state
    return html`
      <div class="nuxy-qbit-add-panel">
        <nuxy-text size="sm" bold>${t('add.prompt')}</nuxy-text>
        <nuxy-text size="xs" mono>${query}</nuxy-text>
        ${addError
          ? html`<nuxy-alert variant="error">${addError}</nuxy-alert>`
          : html`<nuxy-text size="xs" variant="muted"
              >${adding ? t('add.adding') : t('add.hint')}</nuxy-text
            >`}
      </div>
    `
  }

  private statusLabel(item: TorrentItem, t: (key: string) => string): string {
    const key = `state.${item.state}`
    const translated = t(key)
    return translated === key ? item.state : translated
  }

  private pendingLabel(action: TorrentPendingAction, t: (key: string) => string): string {
    const key = `pending.${action}`
    const translated = t(key)
    return translated === key ? action : translated
  }

  private renderItem(
    item: TorrentItem,
    index: number,
    active: boolean,
    copied: boolean,
    t: (key: string) => string
  ): TemplateResult {
    const pending = this.controller?.getPendingAction(item.hash) ?? null
    if (pending) {
      return html`
        <nuxy-list-item ?active=${active} @click=${() => this.controller?.setSelectedIndex(index)}>
          <nuxy-list-item-body>
            <nuxy-list-item-text ?active=${active}>${item.name}</nuxy-list-item-text>
            <nuxy-list-item-meta>
              <nuxy-shimmer-text
                size="xs"
                text=${this.pendingLabel(pending, t)}
              ></nuxy-shimmer-text>
            </nuxy-list-item-meta>
            <nuxy-progress-bar class="nuxy-qbit-progress" max="100" size="sm"></nuxy-progress-bar>
          </nuxy-list-item-body>
        </nuxy-list-item>
      `
    }

    const paused = isPausedState(item.state)
    const meta = paused
      ? `${this.statusLabel(item, t)} — ${formatProgress(item.progress)} of ${formatBytes(item.size)}`
      : `${this.statusLabel(item, t)} — ${formatProgress(item.progress)} · ${formatSpeed(item.dlspeed)} ↓ ${formatSpeed(item.upspeed)} ↑ · ${formatEta(item.eta)}`

    return html`
      <nuxy-list-item ?active=${active} @click=${() => this.controller?.setSelectedIndex(index)}>
        <nuxy-list-item-body>
          <nuxy-list-item-text ?active=${active} variant=${copied ? 'success' : 'default'}>
            ${copied ? t('item.copiedMagnet') : item.name}
          </nuxy-list-item-text>
          <nuxy-list-item-meta>${meta}</nuxy-list-item-meta>
          <nuxy-progress-bar
            class="nuxy-qbit-progress"
            value=${item.progress * 100}
            max="100"
            size="sm"
          ></nuxy-progress-bar>
        </nuxy-list-item-body>
      </nuxy-list-item>
    `
  }
}
