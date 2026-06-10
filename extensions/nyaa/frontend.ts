import {
  LitElement,
  html,
  css,
  nothing,
  customElement,
  property,
  type TemplateResult,
} from '@nuxy/core'
import type { NuxyToolElement } from '@nuxy/core'
import { NyaaController } from './controller.ts'

function formatDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

@customElement('nuxy-tool-nyaa')
export class NuxyToolNyaaElement extends LitElement implements NuxyToolElement {
  static styles = css`
    :host {
      display: flex;
      flex: 1;
      min-height: 0;
    }
  `
  @property({ type: String }) committedQuery = ''
  @property({ type: String }) extensionId = ''

  private controller: NyaaController | null = null
  private _query = ''

  connectedCallback(): void {
    super.connectedCallback()
    this.controller = new NyaaController(() => this.requestUpdate())
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
      <nuxy-two-panel style="flex: 1; min-height: 0;">
        ${this.renderLeft()} ${this.renderRight()}
      </nuxy-two-panel>
    `
  }

  private renderLeft(): TemplateResult {
    const { results, loading, error, query, selectedIndex, copiedId, multiSelectMode, checkedIds } =
      this.controller!.state
    const t = this.controller!.t.t

    if (!query.trim()) {
      return html`<nuxy-empty-state
        message=${t('search.empty.message')}
        hint=${t('search.empty.hint')}
      ></nuxy-empty-state>`
    }
    if (loading) {
      return html`<nuxy-empty-state
        message=${t('search.loading.message')}
        hint=${t('search.loading.hint')}
      ></nuxy-empty-state>`
    }
    if (error) {
      return html`<nuxy-alert variant="error">${error}</nuxy-alert>`
    }
    if (results.length === 0) {
      return html`<nuxy-empty-state
        message=${t('search.noResults.message')}
        hint=${t('search.noResults.hint')}
      ></nuxy-empty-state>`
    }

    return html`
      <nuxy-list active-index=${selectedIndex}>
        ${results.map(
          (item, idx) => html`
            <nuxy-list-item
              ?active=${idx === selectedIndex}
              @click=${() => {
                if (multiSelectMode) this.controller?.toggleCheck(item.id)
                else this.controller?.setSelectedIndex(idx)
              }}
            >
              ${multiSelectMode
                ? html`
                    <div
                      style="display: flex; align-items: center; padding-right: var(--space-2); flex-shrink: 0;"
                    >
                      <input
                        type="checkbox"
                        .checked=${checkedIds.has(item.id)}
                        aria-label=${item.title}
                        style="width:14px;height:14px;cursor:pointer;accent-color:var(--color-accent, var(--color-primary));flex-shrink:0"
                        @change=${() => this.controller?.toggleCheck(item.id)}
                        @click=${(e: Event) => e.stopPropagation()}
                      />
                    </div>
                  `
                : nothing}
              <nuxy-list-item-body>
                <nuxy-list-item-text
                  variant=${copiedId === item.id
                    ? 'success'
                    : item.status === 'success'
                      ? 'success'
                      : item.status === 'danger'
                        ? 'error'
                        : 'default'}
                  >${copiedId === item.id ? t('item.copied') : item.title}</nuxy-list-item-text
                >
                <nuxy-list-item-meta
                  >${item.seeds}S / ${item.leeches}L · ${item.size}</nuxy-list-item-meta
                >
              </nuxy-list-item-body>
            </nuxy-list-item>
          `
        )}
      </nuxy-list>
    `
  }

  private renderRight(): TemplateResult {
    const { multiSelectMode, checkedIds, copiedId } = this.controller!.state
    const t = this.controller!.t.t
    const selectedItem =
      !multiSelectMode && this.controller!.state.selectedIndex >= 0
        ? this.controller!.state.results[this.controller!.state.selectedIndex]
        : null

    if (multiSelectMode) {
      const count = checkedIds.size
      return html`
        <div
          style="display: flex; flex-direction: column; height: 100%; justify-content: center; align-items: center; gap: var(--space-3); padding: var(--space-5); text-align: center;"
        >
          <div
            style="font-size: var(--font-lg, 1.25rem); font-weight: 700; color: ${count > 0
              ? 'var(--color-accent, var(--color-primary))'
              : 'inherit'}; opacity: ${count > 0 ? '1' : '0.4'};"
          >
            ${count > 0
              ? t('item.selectedCount').replace('{count}', String(count))
              : t('item.selectPromptMulti')}
          </div>
          ${count > 0
            ? html`<div style="font-size: var(--font-xs); opacity: 0.5;">
                ${t('item.multiSelectHint')}
              </div>`
            : nothing}
        </div>
      `
    }

    if (!selectedItem) {
      return html`
        <div
          style="display: flex; height: 100%; justify-content: center; align-items: center; opacity: 0.4; font-size: var(--font-sm);"
        >
          ${t('item.selectPrompt')}
        </div>
      `
    }

    const isCopied = copiedId === selectedItem.id
    const statusValue =
      selectedItem.status === 'success'
        ? t('details.status.trusted')
        : selectedItem.status === 'danger'
          ? t('details.status.remake')
          : t('details.status.normal')

    const rows = [
      { label: t('details.category'), value: selectedItem.category },
      { label: t('details.size'), value: selectedItem.size },
      { label: t('details.date'), value: formatDate(selectedItem.date) },
      { label: t('details.seeders'), value: String(selectedItem.seeds) },
      { label: t('details.leechers'), value: String(selectedItem.leeches) },
      { label: t('details.status.label'), value: statusValue },
    ]

    return html`
      <div
        style="display: flex; flex-direction: column; padding: var(--space-5); overflow: hidden; height: calc(100% - var(--space-6)); gap: var(--space-4);"
      >
        <div
          style="font-size: var(--font-sm); font-weight: 600; line-height: 1.4; word-break: break-word; color: ${isCopied
            ? 'var(--color-success)'
            : 'inherit'};"
        >
          ${isCopied ? t('item.magnetCopied') : selectedItem.title}
        </div>
        <nuxy-properties-panel
          title=${t('details.title')}
          rows=${JSON.stringify(rows)}
        ></nuxy-properties-panel>
        <div
          style="font-size: var(--font-xs); opacity: 0.35; word-break: break-all; overflow: hidden; max-height: 3em; font-family: monospace;"
        >
          ${selectedItem.magnet.slice(0, 100)}${selectedItem.magnet.length > 100 ? '…' : ''}
        </div>
      </div>
    `
  }
}
