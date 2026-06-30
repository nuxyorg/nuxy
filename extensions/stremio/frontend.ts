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
import { StremioController } from './controller.ts'
import { isFavorited } from './utils/favorites.ts'
import type { MetaResult, EpisodeResult, StreamResult } from './types.ts'

const GRID_MIN_CELL_WIDTH = 150
const GRID_GAP = 12

function pad(season: number, episode: number): string {
  return `S${season}E${String(episode).padStart(2, '0')}`
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

@customElement('nuxy-tool-stremio')
export class NuxyToolStremioElement extends LitElement implements NuxyToolElement {
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
    .nuxy-stremio-home {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .nuxy-stremio-home-header {
      padding: var(--space-2) var(--space-3) 0;
    }
    .nuxy-stremio-detail-panel {
      display: flex;
      flex-direction: column;
      flex: 1;
      padding: var(--space-5);
      overflow-y: auto;
      gap: var(--space-4);
    }
    .nuxy-stremio-detail-image {
      width: 100%;
      border-radius: var(--radius-md);
      overflow: hidden;
      background: var(--surface-overlay, rgba(255, 255, 255, 0.04));
      flex-shrink: 0;
    }
    .nuxy-stremio-detail-image--poster {
      aspect-ratio: 2 / 3;
    }
    .nuxy-stremio-detail-image--thumb {
      aspect-ratio: 16 / 9;
    }
    .nuxy-stremio-detail-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .nuxy-stremio-title-text {
      line-height: 1.4;
      word-break: break-word;
    }
    .nuxy-stremio-overview {
      opacity: 0.7;
      line-height: 1.5;
    }
    .nuxy-stremio-link-text {
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

  private controller: StremioController | null = null
  private _query = ''
  private omniPortalHost: HTMLDivElement | null = null

  private onOmniPortalRef = (el: Element | undefined): void => {
    this.omniPortalHost = (el as HTMLDivElement | null | undefined) ?? null
    this.controller?.setOmniPortalHost(this.omniPortalHost)
  }

  private onActiveIndexChange = (event: CustomEvent<{ index: number }>): void => {
    this.controller?.setSelectedIndex(event.detail.index)
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.controller = new StremioController(() => this.requestUpdate())
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
      <div class="nuxy-stremio-omni-portal" hidden ${ref(this.onOmniPortalRef)}></div>
      <nuxy-two-panel min-scale="1/4" default-position="2/3">
        ${this.renderLeft()} ${this.renderRight()}
      </nuxy-two-panel>
    `
  }

  private renderLeft(): TemplateResult {
    const c = this.controller!
    const { view, loading, error, actionError, query, favorites } = c.state
    const t = c.t.t

    if (view === 'meta' && !query.trim()) {
      if (favorites.length === 0) {
        return html`<nuxy-empty-state
          message=${t('home.empty.message')}
          hint=${t('home.empty.hint')}
        ></nuxy-empty-state>`
      }
      return html`
        <div class="nuxy-stremio-home">
          <div class="nuxy-stremio-home-header">
            <nuxy-section-header label=${t('home.favorites')}></nuxy-section-header>
          </div>
          ${this.renderMetaGrid(favorites, false)}
        </div>
      `
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
    if (actionError) {
      return html`<nuxy-alert variant="error">${actionError}</nuxy-alert>`
    }

    if (view === 'streams') return this.renderStreamList()
    if (view === 'episodes') return this.renderEpisodeList()

    if (c.state.metas.length === 0) {
      return html`<nuxy-empty-state
        message=${t('search.noResults.message')}
        hint=${t('search.noResults.hint')}
      ></nuxy-empty-state>`
    }
    return this.renderMetaGrid(c.state.metas)
  }

  private metaFooter(item: MetaResult): string {
    const c = this.controller!
    const t = c.t.t
    const kind = item.type === 'series' ? t('badge.series') : t('badge.movie')
    return item.year ? `${kind} · ${item.year}` : kind
  }

  private renderMetaGrid(items: MetaResult[], showFavoriteBadge = true): TemplateResult {
    const c = this.controller!
    const { selectedIndex, favorites } = c.state
    return html`
      <nuxy-grid
        min-cell-width=${GRID_MIN_CELL_WIDTH}
        gap=${GRID_GAP}
        keyboard-nav
        omnibar-handoff
        .scrollLookahead=${false}
        .activeIndex=${selectedIndex}
        @active-index-change=${this.onActiveIndexChange}
      >
        ${items.map((item, idx) => {
          const fav = showFavoriteBadge && isFavorited(favorites, item.id)
          return html`
            <nuxy-grid-item
              .active=${idx === selectedIndex}
              title=${item.name}
              @click=${() => c.setSelectedIndex(idx)}
              @dblclick=${() => c.openMeta(item)}
            >
              <nuxy-poster-card
                poster=${item.poster}
                title=${item.name}
                subtitle=${this.metaFooter(item)}
                ?favorite=${fav}
                ?active=${idx === selectedIndex}
              ></nuxy-poster-card>
            </nuxy-grid-item>
          `
        })}
      </nuxy-grid>
    `
  }

  private renderEpisodeList(): TemplateResult {
    const c = this.controller!
    const t = c.t.t
    const { selectedIndex } = c.state
    const episodes = c.filteredEpisodes
    if (episodes.length === 0) {
      return html`<nuxy-empty-state message=${t('episodes.empty')}></nuxy-empty-state>`
    }
    // Episodes arrive sorted by season; emit a section header on each season change.
    // Headers are not nuxy-list-item, so they don't shift the active-index/selectedIndex.
    let lastSeason: number | null = null
    return html`
      <nuxy-list active-index=${selectedIndex}>
        ${episodes.map((item: EpisodeResult, idx: number) => {
          const seasonHeader =
            item.season !== lastSeason
              ? html`<nuxy-section-header
                  label=${t('episodes.season', { season: item.season })}
                ></nuxy-section-header>`
              : nothing
          lastSeason = item.season
          return html`
            ${seasonHeader}
            <nuxy-list-item
              ?active=${idx === selectedIndex}
              @click=${() => c.setSelectedIndex(idx)}
              @dblclick=${() => c.openEpisode(item)}
            >
              <nuxy-media-preview
                layout="horizontal"
                size="sm"
                thumbnail=${item.thumbnail}
                title=${`${pad(item.season, item.episode)}${item.title ? ` · ${item.title}` : ''}`}
                footer-text=${formatDate(item.released)}
              ></nuxy-media-preview>
            </nuxy-list-item>
          `
        })}
      </nuxy-list>
    `
  }

  private streamTitle(item: StreamResult): string {
    const c = this.controller!
    return item.description || item.name || c.t.t('streams.unnamed')
  }

  private renderStreamList(): TemplateResult {
    const c = this.controller!
    const t = c.t.t
    const { streams, copiedId, selectedIndex } = c.state
    if (streams.length === 0) {
      return html`<nuxy-empty-state message=${t('streams.empty')}></nuxy-empty-state>`
    }
    return html`
      <nuxy-list active-index=${selectedIndex}>
        ${streams.map((item: StreamResult, idx: number) => {
          const kind = item.kind === 'torrent' ? t('badge.torrent') : t('badge.debrid')
          const meta = item.description && item.name ? `${kind} · ${item.name}` : kind
          return html`
            <nuxy-list-item
              ?active=${idx === selectedIndex}
              @click=${() => c.setSelectedIndex(idx)}
            >
              <nuxy-list-item-body>
                <nuxy-list-item-text
                  ?active=${idx === selectedIndex}
                  variant=${copiedId === item.id ? 'success' : 'default'}
                >
                  ${copiedId === item.id ? t('item.copied') : this.streamTitle(item)}
                </nuxy-list-item-text>
                <nuxy-list-item-meta>${meta}</nuxy-list-item-meta>
              </nuxy-list-item-body>
            </nuxy-list-item>
          `
        })}
      </nuxy-list>
    `
  }

  private renderRight(): TemplateResult {
    const c = this.controller!
    const t = c.t.t
    const { view, selectedIndex } = c.state

    if (selectedIndex < 0) {
      return html`<nuxy-empty-state message=${t('item.selectPrompt')}></nuxy-empty-state>`
    }

    if (view === 'streams') return this.renderStreamDetail()
    if (view === 'episodes') return this.renderEpisodeDetail()
    return this.renderMetaDetail()
  }

  private renderMetaDetail(): TemplateResult {
    const c = this.controller!
    const t = c.t.t
    const meta = c.currentMetaList()[c.state.selectedIndex]
    if (!meta) return html`<nuxy-empty-state message=${t('item.selectPrompt')}></nuxy-empty-state>`
    const fav = isFavorited(c.state.favorites, meta.id)
    const rows = [
      {
        label: t('details.type'),
        value: meta.type === 'series' ? t('badge.series') : t('badge.movie'),
      },
      { label: t('details.year'), value: meta.year || '—' },
      { label: t('details.favorite'), value: fav ? t('details.yes') : t('details.no') },
      { label: t('details.id'), value: meta.id },
    ]
    return html`
      <div class="nuxy-stremio-detail-panel">
        ${meta.poster
          ? html`<div class="nuxy-stremio-detail-image nuxy-stremio-detail-image--poster">
              <img src=${meta.poster} alt="" loading="lazy" />
            </div>`
          : nothing}
        <nuxy-text size="sm" bold class="nuxy-stremio-title-text">${meta.name}</nuxy-text>
        <nuxy-properties-panel
          title=${t('details.title')}
          rows=${JSON.stringify(rows)}
        ></nuxy-properties-panel>
      </div>
    `
  }

  private renderEpisodeDetail(): TemplateResult {
    const c = this.controller!
    const t = c.t.t
    const ep = c.filteredEpisodes[c.state.selectedIndex]
    if (!ep) return html`<nuxy-empty-state message=${t('item.selectPrompt')}></nuxy-empty-state>`
    const rows = [
      { label: t('details.season'), value: String(ep.season) },
      { label: t('details.episode'), value: String(ep.episode) },
      { label: t('details.released'), value: formatDate(ep.released) },
    ]
    return html`
      <div class="nuxy-stremio-detail-panel">
        <nuxy-text size="sm" bold class="nuxy-stremio-title-text">
          ${pad(ep.season, ep.episode)}${ep.title ? ` · ${ep.title}` : ''}
        </nuxy-text>
        ${ep.thumbnail
          ? html`<div class="nuxy-stremio-detail-image nuxy-stremio-detail-image--thumb">
              <img src=${ep.thumbnail} alt="" loading="lazy" />
            </div>`
          : nothing}
        ${ep.overview
          ? html`<nuxy-text size="xs" class="nuxy-stremio-overview">${ep.overview}</nuxy-text>`
          : nothing}
        <nuxy-properties-panel
          title=${t('details.title')}
          rows=${JSON.stringify(rows)}
        ></nuxy-properties-panel>
      </div>
    `
  }

  private renderStreamDetail(): TemplateResult {
    const c = this.controller!
    const t = c.t.t
    const stream = c.state.streams[c.state.selectedIndex]
    if (!stream)
      return html`<nuxy-empty-state message=${t('item.selectPrompt')}></nuxy-empty-state>`
    const isCopied = c.state.copiedId === stream.id
    const link = stream.magnet ?? stream.url ?? ''
    const rows = [
      {
        label: t('details.source'),
        value: stream.kind === 'torrent' ? t('badge.torrent') : t('badge.debrid'),
      },
      { label: t('details.quality'), value: stream.name || '—' },
    ]
    return html`
      <div class="nuxy-stremio-detail-panel">
        <nuxy-text
          size="sm"
          bold
          variant=${isCopied ? 'success' : 'default'}
          class="nuxy-stremio-title-text"
        >
          ${isCopied ? t('item.copied') : this.streamTitle(stream)}
        </nuxy-text>
        <nuxy-properties-panel
          title=${t('details.title')}
          rows=${JSON.stringify(rows)}
        ></nuxy-properties-panel>
        <nuxy-text size="xs" mono class="nuxy-stremio-link-text">
          ${link.slice(0, 100)}${link.length > 100 ? '…' : ''}
        </nuxy-text>
      </div>
    `
  }
}
