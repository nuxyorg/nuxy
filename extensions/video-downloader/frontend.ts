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
import { VideoDownloaderController } from './controller.ts'
import { fmtSize, getFormatBadge } from './utils/format.ts'
import type { VideoFormat } from './types.ts'

const TAG = 'nuxy-tool-video-downloader'

@customElement(TAG)
export class NuxyToolVideoDownloaderElement extends LitElement implements NuxyToolElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    nuxy-two-panel {
      flex: 1;
      min-height: 0;
    }

    nuxy-scroll-area {
      flex: 1;
      min-height: 0;
    }

    .nuxy-vd-meta {
      flex-shrink: 0;
      padding: var(--space-3) var(--space-3) 0;
    }
  `

  @property({ type: String })
  declare committedQuery: string
  @property({ type: String })
  declare extensionId: string

  private controller: VideoDownloaderController | null = null
  private _query = ''

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
    this.controller = new VideoDownloaderController(() => this.requestUpdate())
    this.controller.connect()
    if (this._query) this.controller.setQuery(this._query)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.controller?.disconnect()
    this.controller = null
  }

  render(): TemplateResult | typeof nothing {
    if (!this.controller) return nothing
    const t = this.controller.t.t
    const { ytdlpInstalled, loading, error, metadata, activeTab, selectedIndex, focusedPanel } =
      this.controller.state

    if (ytdlpInstalled === false) {
      return html`
        <nuxy-alert variant="danger">${t('install.notInstalled')}</nuxy-alert>
        <nuxy-list>
          <nuxy-list-item>
            <nuxy-list-item-body>
              <nuxy-list-item-text>${t('install.viaPip')}</nuxy-list-item-text>
              <nuxy-list-item-meta>pip install yt-dlp</nuxy-list-item-meta>
            </nuxy-list-item-body>
          </nuxy-list-item>
          <nuxy-list-item>
            <nuxy-list-item-body>
              <nuxy-list-item-text>${t('install.viaBrew')}</nuxy-list-item-text>
              <nuxy-list-item-meta>brew install yt-dlp</nuxy-list-item-meta>
            </nuxy-list-item-body>
          </nuxy-list-item>
          <nuxy-list-item>
            <nuxy-list-item-body>
              <nuxy-list-item-text>${t('install.viaPacman')}</nuxy-list-item-text>
              <nuxy-list-item-meta>pacman -S yt-dlp</nuxy-list-item-meta>
            </nuxy-list-item-body>
          </nuxy-list-item>
        </nuxy-list>
      `
    }

    if (loading) {
      return html`<nuxy-loading-state message=${t('loading.fetchingFormats')}></nuxy-loading-state>`
    }

    if (error) {
      return html`<nuxy-alert variant="danger">${error}</nuxy-alert>`
    }

    if (!metadata) {
      return html`<nuxy-empty-state message=${t('empty.pasteUrl')}></nuxy-empty-state>`
    }

    const formats = this.controller.filteredFormats
    const tabs = VideoDownloaderController.tabs
    const activeTabIndex = tabs.findIndex((tab) => tab.id === activeTab)

    return html`
      <div class="nuxy-vd-meta">
        <nuxy-media-preview
          .thumbnail=${metadata.thumbnail ?? ''}
          .title=${metadata.title}
          .uploader=${metadata.uploader ?? ''}
          .duration=${metadata.duration ?? ''}
          size="sm"
        ></nuxy-media-preview>
      </div>
      <nuxy-two-panel min-scale="1/4" default-position="1/4">
        <div>
          <nuxy-list active-index=${focusedPanel === 'left' ? activeTabIndex : -1}>
            ${tabs.map(
              (tab) => html`
                <nuxy-list-item
                  ?active=${focusedPanel === 'left' && tab.id === activeTab}
                  @click=${() => this.controller?.setActiveTab(tab.id)}
                >
                  <nuxy-list-item-body>
                    <nuxy-list-item-text>${t(`tabs.${tab.id}`)}</nuxy-list-item-text>
                  </nuxy-list-item-body>
                </nuxy-list-item>
              `
            )}
          </nuxy-list>
        </div>
        <nuxy-scroll-area>
          ${this.renderFormats(formats, selectedIndex, focusedPanel, t)}
        </nuxy-scroll-area>
      </nuxy-two-panel>
    `
  }

  private renderFormats(
    formats: VideoFormat[],
    selectedIndex: number,
    focusedPanel: 'left' | 'right',
    t: (key: string) => string
  ): TemplateResult {
    if (formats.length === 0) {
      return html`<nuxy-empty-state message=${t('empty.noFormats')}></nuxy-empty-state>`
    }

    const activeIndex = focusedPanel === 'right' ? selectedIndex : -1

    return html`
      <nuxy-list active-index=${activeIndex}>
        ${formats.map((f, idx) => {
          const { variant, text } = getFormatBadge(f)
          return html`
            <nuxy-list-item
              ?active=${focusedPanel === 'right' && idx === selectedIndex}
              @click=${() => this.controller?.selectFormat(idx)}
            >
              <nuxy-list-item-body>
                <nuxy-list-item-text>
                  ${f.resolution}
                  <nuxy-tag variant=${variant}>${text}</nuxy-tag>
                </nuxy-list-item-text>
                <nuxy-list-item-meta>${f.note} · ${fmtSize(f.filesize)}</nuxy-list-item-meta>
              </nuxy-list-item-body>
            </nuxy-list-item>
          `
        })}
      </nuxy-list>
    `
  }
}
