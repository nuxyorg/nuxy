import type { ExtensionManifest, ShellAction, TemplateResult } from '@nuxyorg/core'
import { render, html } from '@nuxyorg/core'
import {
  completeToolAction,
  setToolSearchPlaceholder,
  BaseExtensionController,
} from '@nuxyorg/extension-sdk'
import manifestJson from './manifest.json'
import type { NyaaResult, EnterAction } from './types.ts'
import {
  ENTER_ACTION_COPY,
  ENTER_ACTION_DOWNLOAD,
  ENTER_ACTION_TORRENT_CLIENT,
  enterActionLabel,
} from './utils/enter-action-options.ts'
import {
  DEFAULT_ENTER_ACTION_PRIORITY,
  resolveEffectiveActions,
} from './utils/enter-action-priority.ts'
import {
  handoffTorrent,
  handoffTorrents,
  isTorrentClientReady,
  downloadTorrentViaSystem,
  downloadTorrentsViaSystem,
} from './utils/torrent-handoff.ts'

const EXT_ID = 'com.nuxy.nyaa'
const POLL_INTERVAL_MS = 2000
const manifest = manifestJson as ExtensionManifest

export type { EnterAction } from './types.ts'

export interface NyaaState {
  query: string
  results: NyaaResult[]
  loading: boolean
  error: string | null
  actionError: string | null
  selectedIndex: number
  multiSelectMode: boolean
  checkedIds: Set<string>
  copiedId: string | null
  enterActionPriority: EnterAction[]
  torrentClientReady: boolean
}

export class NyaaController extends BaseExtensionController<NyaaState> {
  private searchTimer: ReturnType<typeof setTimeout> | null = null
  private searchGen = 0
  private copiedTimer: ReturnType<typeof setTimeout> | null = null
  private omniPortalHost: HTMLDivElement | null = null
  private torrentClientPollTimer: ReturnType<typeof setInterval> | null = null

  setOmniPortalHost(host: HTMLDivElement | null): void {
    this.omniPortalHost = host
    if (host) window.core?.shell?.setOmniBarPortal(host)
  }

  constructor(onUpdate: () => void) {
    super(
      EXT_ID,
      {
        query: '',
        results: [],
        loading: false,
        error: null,
        actionError: null,
        selectedIndex: -1,
        multiSelectMode: false,
        checkedIds: new Set(),
        copiedId: null,
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
    this.startTorrentClientPoll()

    const offExtSettings = window.core?.events?.on('extension-settings-updated', (detail) => {
      if (detail.extId !== EXT_ID) return
      this.reloadActionSettings()
    })
    if (offExtSettings) this.cleanups.push(offExtSettings)

    this.bindKeyboard()
  }

  private reloadActionSettings(): void {
    if (!window.core?.ipc) return

    window.core.ipc
      .invoke(EXT_ID, 'getActionSettings', {}, { callerExtId: EXT_ID })
      .then((res: unknown) => {
        const r = res as {
          success: boolean
          data?: { enterActionPriority?: EnterAction[] }
        } | null
        if (r?.success && r.data) {
          const enterActionPriority = r.data.enterActionPriority ?? [
            ...DEFAULT_ENTER_ACTION_PRIORITY,
          ]
          this.store.setState({ enterActionPriority })
          void this.pollTorrentClientStatus()
          window.core?.shell?.refreshShellActions()
        }
      })
      .catch(() => {})
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

  setQuery(query: string): void {
    if (this.state.query === query) return
    this.store.setState({
      query,
      selectedIndex: -1,
      multiSelectMode: false,
      checkedIds: new Set(),
    })
    this.syncSearch()
    window.core?.shell?.refreshShellActions()
  }

  syncSearchPlaceholder(): void {
    setToolSearchPlaceholder(this.t.t, 'search.placeholder')
  }

  setSelectedIndex(index: number | ((prev: number) => number)): void {
    const prev = this.state.selectedIndex
    const next = typeof index === 'function' ? index(prev) : index
    this.store.setState({ selectedIndex: next })
    window.core?.shell?.refreshShellActions()
  }

  toggleCheck(id: string): void {
    const next = new Set(this.state.checkedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    this.store.setState({ checkedIds: next })
    window.core?.shell?.refreshShellActions()
  }

  setMultiSelectMode(val: boolean): void {
    this.store.setState({
      multiSelectMode: val,
      checkedIds: val ? this.state.checkedIds : new Set(),
    })
    window.core?.shell?.refreshShellActions()
  }

  handleCopyMagnet(id: string, magnet: string): void {
    window.core.ipc
      .invoke(EXT_ID, 'copyMagnet', { magnet }, { callerExtId: EXT_ID })
      .then(() => {
        this.store.setState({ copiedId: id })
        if (this.copiedTimer) clearTimeout(this.copiedTimer)
        this.copiedTimer = setTimeout(() => this.store.setState({ copiedId: null }), 2000)
        completeToolAction(manifest)
      })
      .catch(() => {})
  }

  handleDownloadTorrent(id: string): void {
    void downloadTorrentViaSystem(id).then((outcome) => {
      if (!outcome.ok) {
        this.store.setState({ actionError: outcome.error })
        return
      }
      this.store.setState({ actionError: null })
      completeToolAction(manifest)
    })
  }

  handleCopyMagnets(items: Array<{ id: string; magnet: string }>): void {
    window.core.ipc
      .invoke(
        EXT_ID,
        'copyMagnets',
        { magnets: items.map((i) => i.magnet) },
        { callerExtId: EXT_ID }
      )
      .then(() => completeToolAction(manifest))
      .catch(() => {})
  }

  handleDownloadTorrents(ids: string[]): void {
    const items = this.state.results
      .filter((item) => ids.includes(item.id))
      .map((item) => ({ id: item.id, url: item.magnet }))
    const handoff = this.state.torrentClientReady
      ? handoffTorrents(items)
      : downloadTorrentsViaSystem(ids)
    void handoff.then((outcome) => {
      if (!outcome.ok) {
        this.store.setState({ actionError: outcome.error })
        return
      }
      this.store.setState({ actionError: null })
      if (outcome.via === 'system') completeToolAction(manifest)
    })
  }

  private async runTorrentHandoff(result: NyaaResult): Promise<void> {
    const outcome = await handoffTorrent(result.id, result.magnet)
    if (!outcome.ok) {
      this.store.setState({ actionError: outcome.error })
      return
    }
    this.store.setState({ actionError: null })
  }

  private effectiveActions() {
    const result = resolveEffectiveActions(
      this.state.enterActionPriority,
      this.state.torrentClientReady
    )
    return result
  }

  private executeAction(action: EnterAction, result: NyaaResult): void {
    switch (action) {
      case ENTER_ACTION_COPY:
        this.handleCopyMagnet(result.id, result.magnet)
        break
      case ENTER_ACTION_DOWNLOAD:
        this.handleDownloadTorrent(result.id)
        break
      case ENTER_ACTION_TORRENT_CLIENT:
        void this.runTorrentHandoff(result)
        break
    }
  }

  private setOmniBarPortal(template: TemplateResult | null): void {
    const shell = window.core?.shell
    if (!shell) return
    if (!this.omniPortalHost) return
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
      this.store.setState({ results: [], loading: false, error: null, actionError: null })
      this.setOmniBarPortal(null)
      return
    }

    const generation = ++this.searchGen
    this.store.setState({ error: null, loading: true })
    this.setOmniBarPortal(html`<nuxy-spinner size="sm"></nuxy-spinner>`)

    this.searchTimer = setTimeout(() => {
      if (generation !== this.searchGen) return
      window.core.ipc
        .invoke(EXT_ID, 'search', { query }, { callerExtId: EXT_ID })
        .then((res) => {
          if (generation !== this.searchGen) return
          const r = res as { success: boolean; data?: NyaaResult[]; error?: string } | null
          if (r?.success) {
            this.store.setState({ results: r.data ?? [], loading: false })
          } else {
            this.store.setState({
              error: r?.error ?? 'Search failed',
              results: [],
              loading: false,
            })
          }
          this.setOmniBarPortal(null)
        })
        .catch((err: Error) => {
          if (generation !== this.searchGen) return
          this.store.setState({
            error: err?.message ?? 'Search failed',
            results: [],
            loading: false,
          })
          this.setOmniBarPortal(null)
        })
    }, 1000)
  }

  getKeyActions(): ShellAction[] {
    return this.buildActions()
  }

  private selectedResult(): NyaaResult | null {
    const idx = this.state.selectedIndex
    if (idx < 0) return null
    return this.state.results[idx] ?? null
  }

  private buildEnterAction(variant: 'enter' | 'shiftEnter'): ShellAction | null {
    const t = this.t.t
    const isEnter = variant === 'enter'
    const { enter, shiftEnter } = this.effectiveActions()
    const action = isEnter ? enter : shiftEnter
    if (!action) return null

    const handler = () => {
      const result = this.selectedResult()
      if (!result) return
      if (this.state.multiSelectMode) {
        this.toggleCheck(result.id)
        return
      }
      this.executeAction(action, result)
    }

    if (isEnter) {
      return {
        id: 'nyaa-enter',
        key: 'Enter',
        label: this.state.multiSelectMode ? t('actions.checkToggle') : enterActionLabel(action, t),
        hint: '↵',
        activeOn: () => this.state.selectedIndex >= 0,
        handler,
      }
    }

    return {
      id: 'nyaa-shift-enter',
      key: 'Enter',
      modifiers: ['shift'],
      label: enterActionLabel(action, t),
      hint: ['⇧', '↵'],
      activeOn: () => this.state.selectedIndex >= 0 && !this.state.multiSelectMode,
      handler,
    }
  }

  private buildActions(): ShellAction[] {
    const { results, multiSelectMode, checkedIds } = this.state
    const t = this.t.t
    const checkedItems = results.filter((r) => checkedIds.has(r.id))
    const enterAction = this.buildEnterAction('enter')
    const shiftEnterAction = this.buildEnterAction('shiftEnter')

    const actions: ShellAction[] = [
      {
        id: 'nyaa-select-multiple',
        key: 'a',
        modifiers: ['ctrl'],
        label: t('actions.selectMultiple'),
        section: 'actions',
        showInMenu: !multiSelectMode && results.length > 0,
        activeOn: () => !multiSelectMode && results.length > 0,
        handler: () => this.setMultiSelectMode(true),
      },
      {
        id: 'nyaa-exit-select',
        key: 'Escape',
        label: t('actions.exitSelectMultiple'),
        hint: 'Esc',
        activeOn: () => multiSelectMode,
        handler: () => this.setMultiSelectMode(false),
      },
      {
        id: 'nyaa-copy-all',
        key: 'c',
        modifiers: ['ctrl'],
        label: t('actions.copyAll'),
        section: 'actions',
        showInMenu: multiSelectMode && checkedItems.length > 0,
        activeOn: () => multiSelectMode && checkedItems.length > 0,
        handler: () => this.handleCopyMagnets(checkedItems),
      },
      {
        id: 'nyaa-download-all',
        key: 'd',
        modifiers: ['ctrl'],
        label: t('actions.downloadAll'),
        section: 'actions',
        showInMenu: multiSelectMode && checkedItems.length > 0,
        activeOn: () => multiSelectMode && checkedItems.length > 0,
        handler: () => this.handleDownloadTorrents(checkedItems.map((i) => i.id)),
      },
      {
        id: 'nyaa-navigate-up',
        key: 'ArrowUp',
        label: t('actions.navigate'),
        hint: '↑↓',
        handler: () => {
          if (this.state.results.length === 0) return
          this.setSelectedIndex((prev) => (prev <= 0 ? -1 : prev - 1))
        },
      },
      {
        id: 'nyaa-navigate-down',
        key: 'ArrowDown',
        label: '',
        handler: () => {
          if (this.state.results.length === 0) return
          this.setSelectedIndex((prev) => Math.min(prev + 1, this.state.results.length - 1))
        },
      },
    ]

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
