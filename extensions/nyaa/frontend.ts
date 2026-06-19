import {
  LitElement,
  html,
  css,
  nothing,
  customElement,
  property,
  ref,
  type TemplateResult,
} from '@nuxyorg/core'
import type { NuxyToolElement } from '@nuxyorg/core'
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
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }

    nuxy-two-panel {
      flex: 1;
      min-height: 0;
    }

    .nuxy-nyaa-checkbox {
      padding-right: var(--space-2);
      flex-shrink: 0;
    }

    .nuxy-nyaa-multi-select-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
      justify-content: center;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-5);
      text-align: center;
    }

    .nuxy-nyaa-multi-select-panel nuxy-text.nuxy-nyaa-count--empty {
      opacity: 0.4;
    }

    .nuxy-nyaa-detail-panel {
      display: flex;
      flex-direction: column;
      flex: 1;
      padding: var(--space-5);
      overflow: hidden;
      gap: var(--space-4);
    }

    .nuxy-nyaa-title-text {
      line-height: 1.4;
      word-break: break-word;
    }

    .nuxy-nyaa-magnet-text {
      opacity: 0.35;
      word-break: break-all;
      overflow: hidden;
      max-height: 3em;
    }
  `
  @property({ type: String })
  declare committedQuery: string
  @property({ type: String })
  declare extensionId: string

  private controller: NyaaController | null = null
  private _query = ''
  private omniPortalHost: HTMLDivElement | null = null

  private onOmniPortalRef = (el: Element | undefined): void => {
    this.omniPortalHost = (el as HTMLDivElement | null | undefined) ?? null
    this.controller?.setOmniPortalHost(this.omniPortalHost)
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.controller = new NyaaController(() => this.requestUpdate())
    this.controller.setOmniPortalHost(this.omniPortalHost)
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
      <div class="nuxy-nyaa-omni-portal" hidden ${ref(this.onOmniPortalRef)}></div>
      <nuxy-two-panel min-scale="1/4" default-position="1/2">
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
                    <nuxy-checkbox
                      class="nuxy-nyaa-checkbox"
                      ?checked=${checkedIds.has(item.id)}
                      aria-label=${item.title}
                      @nuxy-checkbox-change=${() => this.controller?.toggleCheck(item.id)}
                      @click=${(e: Event) => e.stopPropagation()}
                    ></nuxy-checkbox>
                  `
                : nothing}
              <nuxy-list-item-body>
                <nuxy-list-item-text
                  ?active=${idx === selectedIndex}
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
        <div class="nuxy-nyaa-multi-select-panel">
          <nuxy-text
            size="lg"
            bold
            variant=${count > 0 ? 'accent' : 'default'}
            class=${count > 0 ? '' : 'nuxy-nyaa-count--empty'}
          >
            ${count > 0
              ? t('item.selectedCount').replace('{count}', String(count))
              : t('item.selectPromptMulti')}
          </nuxy-text>
          ${count > 0
            ? html`<nuxy-text size="xs" variant="muted">${t('item.multiSelectHint')}</nuxy-text>`
            : nothing}
        </div>
      `
    }

    if (!selectedItem) {
      return html`<nuxy-empty-state message=${t('item.selectPrompt')}></nuxy-empty-state>`
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
      <div class="nuxy-nyaa-detail-panel">
        <nuxy-text
          size="sm"
          bold
          variant=${isCopied ? 'success' : 'default'}
          class="nuxy-nyaa-title-text"
        >
          ${isCopied ? t('item.magnetCopied') : selectedItem.title}
        </nuxy-text>
        <nuxy-properties-panel
          title=${t('details.title')}
          rows=${JSON.stringify(rows)}
        ></nuxy-properties-panel>
        <nuxy-text size="xs" mono class="nuxy-nyaa-magnet-text">
          ${selectedItem.magnet.slice(0, 100)}${selectedItem.magnet.length > 100 ? '…' : ''}
        </nuxy-text>
      </div>
    `
  }
}
