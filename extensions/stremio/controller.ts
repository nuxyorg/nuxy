import type { ExtensionManifest, ShellAction, TemplateResult } from '@nuxyorg/core'
import { logCaughtError, render, html } from '@nuxyorg/core'
import { pairedKeyAction } from '../ui-default/src/hooks/paired-key-action.ts'
import {
  completeToolAction,
  setToolSearchPlaceholder,
  BaseExtensionController,
} from '@nuxyorg/extension-sdk'
import manifestJson from './manifest.json'
import type { MetaResult, EpisodeResult, StreamResult, ContentType, EnterAction } from './types.ts'
import {
  ENTER_ACTION_TORRENT_CLIENT,
  ENTER_ACTION_COPY_MAGNET,
  ENTER_ACTION_PLAY,
  ENTER_ACTION_COPY_LINK,
  enterActionLabelKey,
} from './utils/enter-action-options.ts'
import {
  DEFAULT_ENTER_ACTION_PRIORITY,
  resolveEffectiveActions,
} from './utils/enter-action-priority.ts'
import { handoffMagnet, isTorrentClientReady } from './utils/torrent-handoff.ts'
import { isFavorited } from './utils/favorites.ts'
import { filterEpisodes } from './utils/filter-episodes.ts'

const EXT_ID = 'com.nuxy.stremio'
const POLL_INTERVAL_MS = 2000
const manifest = manifestJson as ExtensionManifest

export type View = 'meta' | 'episodes' | 'streams'

export interface StremioState {
  query: string
  /** Last meta-view search text; kept while drilling into episodes so back restores results. */
  metaQuery: string
  view: View
  metas: MetaResult[]
  favorites: MetaResult[]
  episodes: EpisodeResult[]
  streams: StreamResult[]
  loading: boolean
  error: string | null
  actionError: string | null
  selectedIndex: number
  copiedId: string | null
  selectedMeta: MetaResult | null
  selectedEpisode: EpisodeResult | null
  enterActionPriority: EnterAction[]
  torrentClientReady: boolean
}

export class StremioController extends BaseExtensionController<StremioState> {
  private searchTimer: ReturnType<typeof setTimeout> | null = null
  private searchGen = 0
  private loadGen = 0
  private copiedTimer: ReturnType<typeof setTimeout> | null = null
  private omniPortalHost: HTMLDivElement | null = null
  private torrentClientPollTimer: ReturnType<typeof setInterval> | null = null
  private pollView: View | null = null

  setOmniPortalHost(host: HTMLDivElement | null): void {
    this.omniPortalHost = host
    if (host) window.core?.shell?.setOmniBarPortal(host)
  }

  constructor(onUpdate: () => void) {
    super(
      EXT_ID,
      {
        query: '',
        metaQuery: '',
        view: 'meta',
        metas: [],
        favorites: [],
        episodes: [],
        streams: [],
        loading: false,
        error: null,
        actionError: null,
        selectedIndex: -1,
        copiedId: null,
        selectedMeta: null,
        selectedEpisode: null,
        enterActionPriority: [...DEFAULT_ENTER_ACTION_PRIORITY],
        torrentClientReady: false,
      },
      onUpdate
    )
  }

  connect(): void {
    if (!window.core?.ipc) return
    this.syncSearchPlaceholder()
    this.reloadActionSettings()
    this.loadFavorites()
    this.pollView = this.state.view
    this.syncTorrentClientPoll()

    const offExtSettings = window.core?.events?.on('extension-settings-updated', (detail) => {
      if (detail.extId !== EXT_ID) return
      this.reloadActionSettings()
    })
    if (offExtSettings) this.cleanups.push(offExtSettings)

    this.bindKeyboard()
  }

  disconnect(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer)
    if (this.copiedTimer) clearTimeout(this.copiedTimer)
    this.stopTorrentClientPoll()
    this.setOmniBarPortal(null)
    this.cleanups.forEach((fn) => fn())
    this.cleanups = []
    this.t.destroy()
    window.core?.shell?.registerShellActions(null)
  }

  syncSearchPlaceholder(): void {
    setToolSearchPlaceholder(this.t.t, 'search.placeholder')
  }

  protected onStoreChange(): void {
    if (this.pollView !== this.state.view) {
      this.pollView = this.state.view
      this.syncTorrentClientPoll()
    }
    this.onUpdate()
  }

  private syncTorrentClientPoll(): void {
    if (this.state.view === 'streams') {
      this.startTorrentClientPoll()
    } else {
      this.stopTorrentClientPoll()
    }
  }

  private reloadActionSettings(): void {
    if (!window.core?.ipc) return
    window.core.ipc
      .invoke(EXT_ID, 'getActionSettings', {}, { callerExtId: EXT_ID })
      .then((res: unknown) => {
        const r = res as { success: boolean; data?: { enterActionPriority?: EnterAction[] } } | null
        if (r?.success && r.data) {
          this.store.setState({
            enterActionPriority: r.data.enterActionPriority ?? [...DEFAULT_ENTER_ACTION_PRIORITY],
          })
          window.core?.shell?.refreshShellActions()
        }
      })
      .catch((err) => logCaughtError(EXT_ID, err, 'getActionSettings'))
  }

  private startTorrentClientPoll(): void {
    if (this.torrentClientPollTimer) return
    void this.pollTorrentClientStatus()
    this.torrentClientPollTimer = setInterval(() => {
      void this.pollTorrentClientStatus()
    }, POLL_INTERVAL_MS)
  }

  private stopTorrentClientPoll(): void {
    if (this.torrentClientPollTimer) {
      clearInterval(this.torrentClientPollTimer)
      this.torrentClientPollTimer = null
    }
  }

  private async pollTorrentClientStatus(): Promise<void> {
    const ready = await isTorrentClientReady()
    if (ready === this.state.torrentClientReady) return
    this.store.setState({ torrentClientReady: ready })
    window.core?.shell?.refreshShellActions()
  }

  setQuery(query: string): void {
    if (this.state.query === query) return

    if (this.state.view === 'episodes') {
      this.store.setState({ query, selectedIndex: -1, actionError: null })
      window.core?.shell?.refreshShellActions()
      return
    }

    this.store.setState({
      query,
      metaQuery: query,
      view: 'meta',
      selectedIndex: -1,
      episodes: [],
      streams: [],
      selectedMeta: null,
      selectedEpisode: null,
      actionError: null,
    })
    this.syncSearch()
    window.core?.shell?.refreshShellActions()
  }

  /** Episodes visible in the list after applying the omnibar filter. */
  get filteredEpisodes(): EpisodeResult[] {
    return filterEpisodes(this.state.episodes, this.state.query)
  }

  setSelectedIndex(index: number | ((prev: number) => number)): void {
    const prev = this.state.selectedIndex
    const next = typeof index === 'function' ? index(prev) : index
    if (!Number.isFinite(next)) return
    if (next === prev) {
      window.core?.shell?.refreshShellActions()
      return
    }
    this.store.setState({ selectedIndex: next })
    window.core?.shell?.refreshShellActions()
  }

  /** Titles shown in the meta view: search results when querying, favorites on the home screen. */
  currentMetaList(): MetaResult[] {
    return this.state.metaQuery.trim() ? this.state.metas : this.state.favorites
  }

  /** The list backing the active view. */
  activeList(): Array<MetaResult | EpisodeResult | StreamResult> {
    const { view, streams } = this.state
    if (view === 'episodes') return this.filteredEpisodes
    if (view === 'streams') return streams
    return this.currentMetaList()
  }

  // ── Favorites ───────────────────────────────────────────────────────────

  private loadFavorites(): void {
    if (!window.core?.ipc) return
    window.core.ipc
      .invoke(EXT_ID, 'getFavorites', {}, { callerExtId: EXT_ID })
      .then((res: unknown) => {
        const r = res as { success: boolean; data?: MetaResult[] } | null
        if (r?.success) {
          this.store.setState({ favorites: r.data ?? [] })
          window.core?.shell?.refreshShellActions()
        }
      })
      .catch((err) => logCaughtError(EXT_ID, err, 'getFavorites'))
  }

  selectedMetaItem(): MetaResult | null {
    if (this.state.view !== 'meta') return null
    return this.currentMetaList()[this.state.selectedIndex] ?? null
  }

  isSelectedFavorited(): boolean {
    const meta = this.selectedMetaItem()
    return meta ? isFavorited(this.state.favorites, meta.id) : false
  }

  toggleSelectedFavorite(): void {
    const meta = this.selectedMetaItem()
    if (!meta) return
    window.core.ipc
      .invoke(EXT_ID, 'toggleFavorite', { meta }, { callerExtId: EXT_ID })
      .then((res: unknown) => {
        const r = res as { success: boolean; data?: { favorites: MetaResult[] } } | null
        if (!r?.success || !r.data) return
        this.store.setState({ favorites: r.data.favorites })
        // On the home screen the list can shrink — keep the selection in range.
        const len = this.currentMetaList().length
        if (this.state.selectedIndex >= len) {
          this.store.setState({ selectedIndex: len - 1 })
        }
        window.core?.shell?.refreshShellActions()
      })
      .catch((err) => logCaughtError(EXT_ID, err, 'toggleFavorite'))
  }

  // ── Navigation ──────────────────────────────────────────────────────────

  openSelected(): void {
    const idx = this.state.selectedIndex
    if (idx < 0) return
    if (this.state.view === 'meta') {
      const meta = this.currentMetaList()[idx]
      if (meta) this.openMeta(meta)
    } else if (this.state.view === 'episodes') {
      const ep = this.filteredEpisodes[idx]
      if (ep) this.openEpisode(ep)
    }
  }

  openMeta(meta: MetaResult): void {
    this.store.setState({ selectedMeta: meta, actionError: null })
    if (meta.type === 'series') {
      this.loadEpisodes(meta)
    } else {
      this.loadStreams('movie', meta.id)
    }
  }

  openEpisode(ep: EpisodeResult): void {
    this.store.setState({ selectedEpisode: ep })
    this.loadStreams('series', ep.id)
  }

  goBack(): void {
    const { view, selectedMeta } = this.state
    if (view === 'streams') {
      if (selectedMeta?.type === 'series') {
        this.store.setState({ view: 'episodes', streams: [], selectedIndex: -1, error: null })
      } else {
        this.store.setState({
          view: 'meta',
          streams: [],
          selectedMeta: null,
          selectedIndex: -1,
          error: null,
        })
      }
    } else if (view === 'episodes') {
      this.store.setState({
        view: 'meta',
        episodes: [],
        selectedMeta: null,
        selectedIndex: -1,
        error: null,
      })
    }
    window.core?.shell?.controlOmniBar('show')
    window.core?.shell?.refreshShellActions()
  }

  private loadEpisodes(meta: MetaResult): void {
    const gen = ++this.loadGen
    this.store.setState({ loading: true, error: null, episodes: [], selectedIndex: -1 })
    this.setOmniBarPortal(html`<nuxy-spinner size="sm"></nuxy-spinner>`)
    window.core.ipc
      .invoke(EXT_ID, 'getSeriesEpisodes', { id: meta.id }, { callerExtId: EXT_ID })
      .then((res) => {
        if (gen !== this.loadGen) return
        const r = res as { success: boolean; data?: EpisodeResult[]; error?: string } | null
        if (r?.success) {
          const episodes = r.data ?? []
          this.store.setState({
            episodes,
            view: 'episodes',
            loading: false,
            query: '',
            selectedIndex: episodes.length > 0 ? 0 : -1,
          })
        } else {
          this.store.setState({ error: r?.error ?? 'Failed to load episodes', loading: false })
        }
        // Drilling in via the grid disabled the omnibar (handoff); restore search here.
        window.core?.shell?.controlOmniBar('clear')
        window.core?.shell?.controlOmniBar('show')
        this.setOmniBarPortal(null)
        window.core?.shell?.refreshShellActions()
      })
      .catch((err: Error) => {
        if (gen !== this.loadGen) return
        this.store.setState({ error: err?.message ?? 'Failed to load episodes', loading: false })
        this.setOmniBarPortal(null)
      })
  }

  private loadStreams(type: ContentType, id: string): void {
    const gen = ++this.loadGen
    this.store.setState({ loading: true, error: null, streams: [], selectedIndex: -1 })
    this.setOmniBarPortal(html`<nuxy-spinner size="sm"></nuxy-spinner>`)
    window.core.ipc
      .invoke(EXT_ID, 'getStreams', { type, id }, { callerExtId: EXT_ID })
      .then((res) => {
        if (gen !== this.loadGen) return
        const r = res as { success: boolean; data?: StreamResult[]; error?: string } | null
        if (r?.success) {
          const streams = r.data ?? []
          this.store.setState({
            streams,
            view: 'streams',
            loading: false,
            selectedIndex: streams.length > 0 ? 0 : -1,
          })
        } else {
          this.store.setState({ error: r?.error ?? 'Failed to load streams', loading: false })
        }
        // Drilling in via the grid disabled the omnibar (handoff); restore search here.
        window.core?.shell?.controlOmniBar('show')
        this.setOmniBarPortal(null)
        window.core?.shell?.refreshShellActions()
      })
      .catch((err: Error) => {
        if (gen !== this.loadGen) return
        this.store.setState({ error: err?.message ?? 'Failed to load streams', loading: false })
        this.setOmniBarPortal(null)
      })
  }

  // ── Stream actions ──────────────────────────────────────────────────────

  private effectiveActions(stream: StreamResult) {
    return resolveEffectiveActions(this.state.enterActionPriority, {
      kind: stream.kind,
      torrentClientReady: this.state.torrentClientReady,
    })
  }

  private flashCopied(id: string): void {
    this.store.setState({ copiedId: id })
    if (this.copiedTimer) clearTimeout(this.copiedTimer)
    this.copiedTimer = setTimeout(() => this.store.setState({ copiedId: null }), 2000)
  }

  executeStreamAction(action: EnterAction, stream: StreamResult): void {
    switch (action) {
      case ENTER_ACTION_TORRENT_CLIENT:
        if (!stream.magnet) return
        void handoffMagnet(stream.magnet).then((outcome) => {
          if (!outcome.ok) this.store.setState({ actionError: outcome.error ?? 'Handoff failed' })
          else this.store.setState({ actionError: null })
        })
        break
      case ENTER_ACTION_COPY_MAGNET:
        if (!stream.magnet) return
        this.copyText(stream.magnet, stream.id)
        break
      case ENTER_ACTION_PLAY:
        if (!stream.url) return
        window.core.ipc
          .invoke(EXT_ID, 'openExternal', { url: stream.url }, { callerExtId: EXT_ID })
          .then(() => {
            this.store.setState({ actionError: null })
            completeToolAction(manifest)
          })
          .catch((err) => logCaughtError(EXT_ID, err, 'openExternal'))
        break
      case ENTER_ACTION_COPY_LINK:
        if (!stream.url) return
        this.copyText(stream.url, stream.id)
        break
    }
  }

  private copyText(text: string, id: string): void {
    window.core.ipc
      .invoke(EXT_ID, 'copyText', { text }, { callerExtId: EXT_ID })
      .then(() => {
        this.flashCopied(id)
        completeToolAction(manifest)
      })
      .catch((err) => logCaughtError(EXT_ID, err, 'copyText'))
  }

  // ── Omnibar portal / search ───────────────────────────────────────────────

  private setOmniBarPortal(template: TemplateResult | null): void {
    const shell = window.core?.shell
    if (!shell || !this.omniPortalHost) return
    if (!template) {
      render(html``, this.omniPortalHost)
      shell.setOmniBarPortal(null)
      return
    }
    shell.setOmniBarPortal(this.omniPortalHost)
    render(template, this.omniPortalHost)
  }

  private syncSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer)
    const { query } = this.state

    if (!query.trim()) {
      this.store.setState({ metas: [], loading: false, error: null })
      this.setOmniBarPortal(null)
      return
    }

    const generation = ++this.searchGen
    this.store.setState({ error: null, loading: true })
    this.setOmniBarPortal(html`<nuxy-spinner size="sm"></nuxy-spinner>`)

    this.searchTimer = setTimeout(() => {
      if (generation !== this.searchGen) return
      window.core.ipc
        .invoke(EXT_ID, 'searchMeta', { query }, { callerExtId: EXT_ID })
        .then((res) => {
          if (generation !== this.searchGen) return
          const r = res as { success: boolean; data?: MetaResult[]; error?: string } | null
          if (r?.success) {
            this.store.setState({ metas: r.data ?? [], loading: false })
          } else {
            this.store.setState({ error: r?.error ?? 'Search failed', metas: [], loading: false })
          }
          this.setOmniBarPortal(null)
        })
        .catch((err: Error) => {
          if (generation !== this.searchGen) return
          this.store.setState({ error: err?.message ?? 'Search failed', metas: [], loading: false })
          this.setOmniBarPortal(null)
        })
    }, 1000)
  }

  // ── Keyboard actions ──────────────────────────────────────────────────────

  getKeyActions(): ShellAction[] {
    return this.buildActions()
  }

  private selectedStream(): StreamResult | null {
    if (this.state.view !== 'streams') return null
    const idx = this.state.selectedIndex
    if (idx < 0) return null
    return this.state.streams[idx] ?? null
  }

  private buildEnterAction(variant: 'enter' | 'shiftEnter'): ShellAction | null {
    const t = this.t.t
    const isEnter = variant === 'enter'

    if (this.state.view !== 'streams') {
      // Drill-in views: Enter opens; no shift action.
      if (!isEnter) return null
      return {
        id: 'stremio-enter',
        key: 'Enter',
        label: t('actions.open'),
        hint: '↵',
        activeOn: () => this.state.selectedIndex >= 0,
        handler: () => this.openSelected(),
      }
    }

    const stream = this.selectedStream()
    const resolved = stream
      ? this.effectiveActions(stream)
      : { enter: null, shiftEnter: null as EnterAction | null }
    const action = isEnter ? resolved.enter : resolved.shiftEnter
    if (!action) return null

    const handler = () => {
      const s = this.selectedStream()
      if (s) this.executeStreamAction(action, s)
    }

    if (isEnter) {
      return {
        id: 'stremio-enter',
        key: 'Enter',
        label: t(enterActionLabelKey(action)),
        hint: '↵',
        activeOn: () => this.selectedStream() !== null,
        handler,
      }
    }

    return {
      id: 'stremio-shift-enter',
      key: 'Enter',
      modifiers: ['shift'],
      label: t(enterActionLabelKey(action)),
      hint: ['⇧', '↵'],
      activeOn: () => this.selectedStream() !== null,
      handler,
    }
  }

  private buildActions(): ShellAction[] {
    const t = this.t.t
    const canFavorite = this.selectedMetaItem() !== null
    const actions: ShellAction[] = [
      {
        id: 'stremio-back',
        key: 'Escape',
        label: t('actions.back'),
        hint: 'Esc',
        activeOn: () => this.state.view !== 'meta',
        handler: () => this.goBack(),
      },
      {
        id: 'stremio-favorite',
        key: 'f',
        modifiers: ['ctrl'],
        label: this.isSelectedFavorited() ? t('actions.unfavorite') : t('actions.favorite'),
        hint: ['⌃', 'F'],
        section: 'actions',
        showInMenu: canFavorite,
        activeOn: () => this.selectedMetaItem() !== null,
        handler: () => this.toggleSelectedFavorite(),
      },
    ]

    // The meta view is a grid — `nuxy-grid keyboard-nav` owns arrow navigation there.
    // List views (episodes / streams) get the controller's own vertical navigator.
    if (this.state.view !== 'meta') {
      actions.push(
        pairedKeyAction({
          id: 'stremio-navigate',
          label: t('actions.navigate'),
          negative: () => {
            if (this.activeList().length === 0) return
            this.setSelectedIndex((prev) => (prev <= 0 ? -1 : prev - 1))
          },
          positive: () => {
            const len = this.activeList().length
            if (len === 0) return
            this.setSelectedIndex((prev) => Math.min(prev + 1, len - 1))
          },
        })
      )
    }

    const enterAction = this.buildEnterAction('enter')
    const shiftEnterAction = this.buildEnterAction('shiftEnter')
    if (enterAction) actions.push(enterAction)
    if (shiftEnterAction) actions.push(shiftEnterAction)

    return actions
  }

  private bindKeyboard(): void {
    window.core?.shell?.registerShellActions(() => this.buildActions())
    this.cleanups.push(() => {
      window.core?.shell?.registerShellActions(null)
    })
  }
}
