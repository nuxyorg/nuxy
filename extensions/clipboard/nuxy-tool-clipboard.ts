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
import { ClipboardController } from './controller.ts'
import type { ClipboardItem } from './types.ts'
import {
  getItemType,
  getListLabel,
  getListMeta,
  getFilename,
  getFileExtension,
  getFileIconType,
  type ItemType,
} from './utils/item-type.ts'

const FILE_ICON_MAP: Record<string, string> = {
  'image-file': 'image',
  code: 'code',
  document: 'document',
  pdf: 'pdf',
  archive: 'archive',
}

@customElement('nuxy-tool-clipboard')
export class NuxyToolClipboardElement extends LitElement implements NuxyToolElement {
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

    .nuxy-clipboard-preview-empty {
      display: flex;
      height: 100%;
      justify-content: center;
      align-items: center;
      opacity: 0.4;
      font-size: var(--font-sm);
    }

    .nuxy-clipboard-detail-panel {
      display: flex;
      flex-direction: column;
      flex: 1;
      padding: var(--space-5);
      overflow: hidden;
      gap: var(--space-4);
    }

    .nuxy-clipboard-preview {
      flex: 1 1 auto;
      overflow-y: auto;
      min-height: 0;
    }

    .nuxy-clipboard-preview-image {
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: var(--radius-lg);
      background: var(--surface-overlay);
      padding: var(--space-3);
      overflow: hidden;
      height: 100%;
    }

    .nuxy-clipboard-preview-image img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .nuxy-clipboard-preview-color {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      height: 100%;
    }

    .nuxy-clipboard-preview-color-swatch {
      flex: 1;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-subtle);
      min-height: 80px;
    }

    .nuxy-clipboard-preview-color-text {
      font-family: monospace;
      font-size: var(--font-body);
      text-align: center;
      opacity: 0.85;
    }

    .nuxy-clipboard-preview-text {
      font-size: var(--font-sm);
      line-height: 1.55;
      opacity: 0.8;
      white-space: pre-wrap;
      word-break: break-word;
      padding: var(--space-3);
      background: var(--surface-overlay);
      border-radius: var(--radius-lg);
      height: 100%;
      box-sizing: border-box;
      overflow: auto;
    }

    .nuxy-clipboard-pin-icon {
      margin-right: var(--space-2);
      vertical-align: middle;
    }
  `

  @property({ type: String })
  declare committedQuery: string
  @property({ type: String })
  declare extensionId: string

  private controller: ClipboardController | null = null
  private _query = ''

  connectedCallback(): void {
    super.connectedCallback()
    this.controller = new ClipboardController(() => this.requestUpdate())
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
    return html`
      <nuxy-two-panel min-scale="1/4" default-position="1/2">
        ${this.renderLeft()} ${this.renderRight()}
      </nuxy-two-panel>
      ${this.renderFileAlert()}
    `
  }

  private renderLeft(): TemplateResult {
    const { selectedIndex, copiedId, query, items } = this.controller!.state
    const filtered = this.controller!.filteredItems
    const t = this.controller!.t.t

    if (filtered.length === 0) {
      return html`
        <nuxy-empty-state
          message=${query ? t('list.noMatches.message') : t('list.empty.message')}
          hint=${query ? t('list.noMatches.hint') : t('list.empty.hint')}
        ></nuxy-empty-state>
      `
    }

    return html`
      <nuxy-list active-index=${selectedIndex}>
        ${filtered.map((item, idx) => {
          const isCopied = copiedId === item.id
          const isActive = idx === selectedIndex
          const isCurrent = items.length > 0 && item.id === items[0].id
          const type = getItemType(item)
          const label = this.localizedListLabel(item, type, isCopied)
          const meta = this.localizedListMeta(item, type, isCurrent)
          return html`
            <nuxy-list-item
              ?active=${isActive}
              @click=${() => this.controller?.setSelectedIndex(idx)}
            >
              ${this.renderLeading(item, type)}
              <nuxy-list-item-body>
                <nuxy-list-item-text variant=${isCopied ? 'success' : 'default'}>
                  ${item.pinned
                    ? html`<nuxy-icon
                        class="nuxy-clipboard-pin-icon"
                        name="pin"
                        size="14"
                      ></nuxy-icon>`
                    : nothing}
                  ${label}
                </nuxy-list-item-text>
                <nuxy-list-item-meta>${meta}</nuxy-list-item-meta>
              </nuxy-list-item-body>
            </nuxy-list-item>
          `
        })}
      </nuxy-list>
    `
  }

  private renderLeading(item: ClipboardItem, type: ItemType): TemplateResult | typeof nothing {
    if (type === 'image') {
      return html`<nuxy-item-leading
        ><img src=${item.image!} alt="" style="width:100%;height:100%;object-fit:cover"
      /></nuxy-item-leading>`
    }
    if (type === 'color') {
      return html`<nuxy-item-leading color=${item.text?.trim() || ''}></nuxy-item-leading>`
    }
    if (type === 'file') {
      const ext = getFileExtension(item.text?.trim() || '')
      const iconName = FILE_ICON_MAP[getFileIconType(ext)] ?? 'file'
      return html`<nuxy-item-leading><nuxy-icon name=${iconName}></nuxy-icon></nuxy-item-leading>`
    }
    if (type === 'url') {
      return html`<nuxy-item-leading><nuxy-icon name="globe"></nuxy-icon></nuxy-item-leading>`
    }
    return nothing
  }

  private renderRight(): TemplateResult {
    const selectedItem = this.controller!.selectedItem
    const { imageDimensions } = this.controller!.state
    const t = this.controller!.t.t

    if (!selectedItem) {
      return html`<div class="nuxy-clipboard-preview-empty">${t('preview.selectPrompt')}</div>`
    }

    const type = getItemType(selectedItem)
    const txt = selectedItem.text?.trim() || ''

    const rows = [
      { label: t('properties.type'), value: t(`item.type.${type}`) || type },
      ...(type === 'file'
        ? [
            { label: t('properties.name'), value: getFilename(txt) },
            { label: t('properties.path'), value: txt },
          ]
        : []),
      ...(type === 'image' && imageDimensions
        ? [{ label: t('properties.dimensions'), value: imageDimensions }]
        : []),
      ...(type === 'color' ? [{ label: t('properties.value'), value: txt }] : []),
      { label: t('properties.copied'), value: new Date(selectedItem.copiedAt).toLocaleString() },
    ]

    return html`
      <div class="nuxy-clipboard-detail-panel">
        <div class="nuxy-clipboard-preview">${this.renderPreview(selectedItem, type, txt)}</div>
        <nuxy-properties-panel
          title=${t('properties.title')}
          rows=${JSON.stringify(rows)}
        ></nuxy-properties-panel>
      </div>
    `
  }

  private renderPreview(item: ClipboardItem, type: ItemType, txt: string): TemplateResult {
    if (type === 'image') {
      return html`
        <div class="nuxy-clipboard-preview-image">
          <img src=${item.image!} alt=${this.controller!.t.t('preview.imageAlt')} />
        </div>
      `
    }
    if (type === 'color') {
      return html`
        <div class="nuxy-clipboard-preview-color">
          <div class="nuxy-clipboard-preview-color-swatch" style="background:${txt}"></div>
          <div class="nuxy-clipboard-preview-color-text">${txt}</div>
        </div>
      `
    }
    return html`<div class="nuxy-clipboard-preview-text">${item.text}</div>`
  }

  private renderFileAlert(): TemplateResult | typeof nothing {
    const { fileExists } = this.controller!.state
    if (fileExists !== false) return nothing
    return html`<nuxy-alert variant="danger"
      >${this.controller!.t.t('alert.fileNotFound')}</nuxy-alert
    >`
  }

  private localizedListLabel(item: ClipboardItem, type: ItemType, isCopied: boolean): string {
    const t = this.controller!.t.t
    if (isCopied) return t('item.copied')
    if (type === 'image') {
      return item.text && item.text !== 'Image' ? item.text : t('item.type.image')
    }
    return getListLabel(item, type, isCopied)
  }

  private localizedListMeta(item: ClipboardItem, type: ItemType, isCurrent: boolean): string {
    const t = this.controller!.t.t
    if (isCurrent) return t('item.current')
    if (type === 'color') return t('item.type.color')
    if (type === 'url') return t('item.type.url')
    if (type === 'image') return t('item.type.image')
    return getListMeta(item, type, isCurrent)
  }
}
