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
import { groupDownloadsByDate } from './utils/groupByDate.ts'
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

    .nuxy-dm-checkbox {
      padding-right: var(--space-2);
      flex-shrink: 0;
    }
  `

  @property({ type: String })
  declare committedQuery: string
  @property({ type: String })
  declare extensionId: string

  private controller: DownloadManagerController | null = null
  private _query = ''
  private _deeplinkApplied = false
  private readonly footerStatusEl = document.createElement('span')

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
    this.footerStatusEl.className = 'nuxy-dm-footer-status'
    this.controller = new DownloadManagerController(() => {
      this.syncFooterStatus()
      this.requestUpdate()
    })
    this.controller.connect()
    if (this._query) this.controller.setQuery(this._query)
    if (this.committedQuery) this.applyDeeplink(this.committedQuery)
    this.syncFooterStatus()
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.controller?.disconnect()
    this.controller = null
    window.core?.shell?.setFooterPortal(null)
  }

  private syncFooterStatus(): void {
    if (!this.controller) {
      this.footerStatusEl.textContent = ''
      window.core?.shell?.setFooterPortal(null)
      return
    }
    const t = this.controller.t.t
    const { multiSelectMode, checkedIds } = this.controller.state
    const text = this.footerStatusText(t, multiSelectMode, checkedIds.size)
    this.footerStatusEl.textContent = text
    window.core?.shell?.setFooterPortal(text ? this.footerStatusEl : null)
  }

  private footerStatusText(t: TranslateFn, multiSelectMode: boolean, count: number): string {
    if (!multiSelectMode || count === 0) return ''
    return t('item.selectedCount').replace('{count}', String(count))
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

  private wrapperStyle(): string {
    return [
      'display:flex',
      'flex-direction:column',
      'flex:1',
      'min-height:0',
      'overflow:hidden',
    ].join(';')
  }

  private panelStyle(): string {
    return [
      'display:flex',
      'flex-direction:column',
      'flex:1',
      'min-height:0',
      'overflow:auto',
    ].join(';')
  }

  render(): TemplateResult | typeof nothing {
    if (!this.controller) return nothing
    const t = this.controller.t.t
    const { items, query, selectedIndex, multiSelectMode, checkedIds } = this.controller.state
    const filteredItems = this.controller.filteredItems

    if (filteredItems.length === 0) {
      return html`
        <div style=${this.panelStyle()}>
          <nuxy-empty-state
            message=${query && items.length > 0 ? t('empty.noMatching') : t('empty.message')}
            hint=${query && items.length > 0 ? '' : t('empty.hint')}
          ></nuxy-empty-state>
        </div>
      `
    }

    const groups = groupDownloadsByDate(filteredItems, t)
    let index = 0

    return html`
      <div style=${this.wrapperStyle()}>
        <div style=${this.panelStyle()}>
          <nuxy-list active-index=${selectedIndex}>
            ${groups.map(
              (group) => html`
                <nuxy-section-header label=${group.label}></nuxy-section-header>
                ${group.items.map((item) => {
                  const i = index++
                  return this.renderItem(
                    item,
                    i,
                    i === selectedIndex,
                    t,
                    multiSelectMode,
                    checkedIds
                  )
                })}
              `
            )}
          </nuxy-list>
        </div>
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
    t: TranslateFn,
    multiSelectMode: boolean,
    checkedIds: Set<string>
  ): TemplateResult {
    const meta =
      item.status === 'downloading'
        ? `${this.statusLabel(item.status, t)} — ${formatBytes(item.bytesDownloaded)} (${formatSpeed(item.speedBps)})`
        : item.status === 'failed' && item.error
          ? `${this.statusLabel(item.status, t)} — ${item.error}`
          : this.statusLabel(item.status, t)

    return html`
      <nuxy-list-item
        ?active=${active}
        @click=${() => {
          if (multiSelectMode) this.controller?.toggleCheck(item.id)
          else this.controller?.setSelectedIndex(index)
        }}
      >
        ${multiSelectMode
          ? html`
              <nuxy-checkbox
                class="nuxy-dm-checkbox"
                ?checked=${checkedIds.has(item.id)}
                aria-label=${item.fileName}
                @nuxy-checkbox-change=${() => this.controller?.toggleCheck(item.id)}
                @click=${(e: Event) => e.stopPropagation()}
              ></nuxy-checkbox>
            `
          : nothing}
        <nuxy-list-item-body>
          <nuxy-list-item-text ?active=${active}>${item.fileName}</nuxy-list-item-text>
          <nuxy-list-item-meta>${meta}</nuxy-list-item-meta>
        </nuxy-list-item-body>
      </nuxy-list-item>
    `
  }
}
