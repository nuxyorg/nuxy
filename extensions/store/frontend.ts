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
import { StoreController } from './controller.ts'
import { permissionVariant, serializeTabs } from './utils/store-filter.ts'
import type { ExtensionListItem } from './types.ts'

@customElement('nuxy-tool-store')
export class NuxyToolStoreElement extends LitElement implements NuxyToolElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }

    nuxy-two-panel {
      flex: 1;
      min-height: 0;
    }

    .nuxy-store-right {
      display: flex;
      flex-direction: row;
      height: 100%;
      min-height: 0;
    }

    .nuxy-store-list-col {
      flex: 1;
      min-width: 0;
      overflow-y: auto;
      border-right: 1px solid var(--border);
    }

    .nuxy-store-detail-col {
      width: 320px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }

    .nuxy-store-list-item-title {
      display: flex;
      align-items: center;
      gap: var(--space-1);
    }

    .nuxy-store-list-item-desc {
      font-size: var(--font-xs);
      opacity: 0.6;
    }

    .nuxy-store-detail-empty {
      display: flex;
      flex: 1;
      align-items: center;
      justify-content: center;
    }

    .nuxy-store-detail-panel {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      padding: var(--space-5);
      height: 100%;
      overflow-y: auto;
    }

    .nuxy-store-detail-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
    }

    .nuxy-store-detail-id {
      font-family: var(--font-mono, monospace);
    }

    .nuxy-store-permissions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1);
    }

    .nuxy-store-risky {
      display: flex;
      align-items: flex-start;
      gap: var(--space-2);
      padding: var(--space-3);
      border-radius: var(--radius-sm);
      background: var(--color-danger-bg, rgba(220, 50, 50, 0.08));
      border: 1px solid var(--color-danger-border, rgba(220, 50, 50, 0.3));
    }

    .nuxy-store-install-action {
      margin-top: auto;
    }
  `

  @property({ type: String })
  declare committedQuery: string
  @property({ type: String })
  declare extensionId: string

  private controller: StoreController | null = null
  private _query = ''

  connectedCallback(): void {
    super.connectedCallback()
    this.controller = new StoreController(() => this.requestUpdate())
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

  render() {
    if (!this.controller) return nothing
    return html`
      <nuxy-two-panel min-scale="1/5" default-position="160px">
        ${this.renderLeft()} ${this.renderRight()}
      </nuxy-two-panel>
    `
  }

  private renderLeft(): TemplateResult {
    const { activeTab } = this.controller!.state
    const navSections = this.controller!.navSections
    return html`
      <nuxy-tab-bar
        tabs=${serializeTabs(navSections)}
        active=${activeTab}
        orientation="vertical"
        @nuxy-tab-bar-change=${(e: CustomEvent<{ id: string }>) =>
          this.controller?.setActiveTab(e.detail.id)}
      ></nuxy-tab-bar>
    `
  }

  private renderRight(): TemplateResult {
    const { loading, extensions } = this.controller!.state
    const t = this.controller!.t.t

    if (loading && extensions.length === 0) {
      return html`<nuxy-loading-state message=${t('loading.connecting')}></nuxy-loading-state>`
    }

    return html`
      <div class="nuxy-store-right">
        <div class="nuxy-store-list-col">${this.renderList()}</div>
        <div class="nuxy-store-detail-col">${this.renderDetail()}</div>
      </div>
    `
  }

  private renderList(): TemplateResult {
    const { error, selectedIndex, focusArea } = this.controller!.state
    const filtered = this.controller!.filteredExtensions
    const t = this.controller!.t.t

    return html`
      ${error ? html`<nuxy-alert variant="danger">${error}</nuxy-alert>` : nothing}
      ${filtered.length === 0
        ? html`<nuxy-empty-state message=${t('list.empty')}></nuxy-empty-state>`
        : html`
            <nuxy-list active-index=${focusArea === 'right' ? selectedIndex : -1}>
              ${filtered.map((ext, idx) => this.renderListItem(ext, idx, selectedIndex, focusArea))}
            </nuxy-list>
          `}
    `
  }

  private renderListItem(
    ext: ExtensionListItem,
    idx: number,
    selectedIndex: number,
    focusArea: 'left' | 'right'
  ): TemplateResult {
    const t = this.controller!.t.t
    const versionText = ext.canUpdate
      ? `v${ext.installedVersion} → v${ext.version}`
      : `v${ext.version}`

    return html`
      <nuxy-list-item
        ?active=${focusArea === 'right' && idx === selectedIndex}
        @click=${() => {
          this.controller?.setSelectedIndex(idx)
          this.controller?.setFocusArea('right')
        }}
      >
        <nuxy-list-item-body>
          <div class="nuxy-store-list-item-title">
            <nuxy-list-item-text>${ext.name}</nuxy-list-item-text>
            ${ext.installed && !ext.canUpdate
              ? html`<nuxy-tag variant="green">${t('badge.installed')}</nuxy-tag>`
              : nothing}
          </div>
          <span class="nuxy-store-list-item-desc">${ext.description}</span>
        </nuxy-list-item-body>
        <nuxy-list-item-meta>
          ${versionText}
          ${ext.canUpdate
            ? html`<nuxy-tag variant="orange">${t('badge.update')}</nuxy-tag>`
            : nothing}
        </nuxy-list-item-meta>
      </nuxy-list-item>
    `
  }

  private renderDetail(): TemplateResult {
    const ext = this.controller!.selectedExtension
    const t = this.controller!.t.t

    if (!ext) {
      return html`
        <div class="nuxy-store-detail-empty">
          <nuxy-empty-state message=${t('detail.selectPrompt')}></nuxy-empty-state>
        </div>
      `
    }

    const hasRiskyPermissions = ext.permissions?.some((p) => p === 'shell' || p === 'fs')

    return html`
      <div class="nuxy-store-detail-panel">
        <div class="nuxy-store-detail-header">
          <div>
            <nuxy-heading size="md">${ext.name}</nuxy-heading>
            <nuxy-text size="xs" variant="muted" class="nuxy-store-detail-id">${ext.id}</nuxy-text>
          </div>
          ${ext.canUpdate
            ? html`<nuxy-tag variant="orange">${t('badge.update')}</nuxy-tag>`
            : nothing}
        </div>

        <nuxy-properties-panel
          rows=${JSON.stringify([
            { label: t('detail.author'), value: ext.author },
            { label: t('detail.version'), value: ext.version },
            { label: t('detail.type'), value: ext.type.toUpperCase() },
          ])}
        ></nuxy-properties-panel>

        <div>
          <nuxy-heading size="sm">${t('detail.description')}</nuxy-heading>
          <nuxy-text size="sm">${ext.description}</nuxy-text>
        </div>

        <div>
          <nuxy-heading size="sm">${t('detail.permissions')}</nuxy-heading>
          ${ext.permissions && ext.permissions.length > 0
            ? html`
                <div class="nuxy-store-permissions">
                  ${ext.permissions.map(
                    (perm) => html`<nuxy-tag variant=${permissionVariant(perm)}>${perm}</nuxy-tag>`
                  )}
                </div>
              `
            : html`<nuxy-text size="xs" variant="muted">${t('detail.noPermissions')}</nuxy-text>`}
        </div>

        ${hasRiskyPermissions
          ? html`
              <div class="nuxy-store-risky">
                <nuxy-icon name="Warning"></nuxy-icon>
                <nuxy-text size="xs">${t('detail.riskyWarning')}</nuxy-text>
              </div>
            `
          : nothing}
        ${!ext.installed || ext.canUpdate
          ? html`
              <nuxy-button
                class="nuxy-store-install-action"
                @click=${() => this.controller?.handleInstall(ext)}
              >
                ${ext.canUpdate ? t('actions.update') : t('actions.install')}
              </nuxy-button>
            `
          : nothing}
      </div>
    `
  }
}
