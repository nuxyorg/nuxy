import { BaseExtensionController, setToolSearchPlaceholder } from '@nuxyorg/extension-sdk'
import type { ShellAction } from '@nuxyorg/core'
import { pairedKeyAction } from '../ui-default/src/hooks/paired-key-action.ts'
import { invoke } from './utils/ipc.ts'
import { isTorrentLink } from './utils/torrent-link.ts'
import { parseAddDeeplink } from './utils/parse-deeplink.ts'
import { mapQbitError } from './utils/get-status.ts'
import { isCompletedTorrent } from './utils/state-label.ts'
import type { QbitConnectionState, TorrentItem, TorrentPendingAction } from './types.ts'

const EXT_ID = 'com.nuxy.qbittorrent'
const POLL_INTERVAL_MS = 2000
export const MIN_PENDING_MS = 400

const PAUSED_STATES = new Set([
  'pauseddl',
  'pausedup',
  'stoppeddl',
  'stoppedup',
  'error',
  'missingfiles',
])

export type CopiedKind = 'magnet' | 'savePath'

export interface QbitState {
  torrents: TorrentItem[]
  query: string
  selectedIndex: number
  loading: boolean
  error: string | null
  connectionState: QbitConnectionState | null
  adding: boolean
  addError: string | null
  actionError: string | null
  copiedHash: string | null
  copiedKind: CopiedKind | null
  pendingActions: Record<string, TorrentPendingAction>
}

export function isPausedState(state: string): boolean {
  return PAUSED_STATES.has(state.toLowerCase())
}

export function isPendingResolved(
  action: TorrentPendingAction,
  state: string,
  itemPresent: boolean
): boolean {
  switch (action) {
    case 'pause':
      return isPausedState(state)
    case 'resume':
      return !isPausedState(state)
    case 'recheck':
      return state.toLowerCase().startsWith('checking')
    case 'reannounce':
      return itemPresent
    case 'remove':
      return !itemPresent
  }
}

export function resolvePendingActions(
  pending: Record<string, TorrentPendingAction>,
  torrents: TorrentItem[],
  pendingStartedAt: Record<string, number> = {},
  now = Date.now(),
  minDurationMs = MIN_PENDING_MS
): Record<string, TorrentPendingAction> {
  const next = { ...pending }
  for (const [hash, action] of Object.entries(pending)) {
    const startedAt = pendingStartedAt[hash] ?? 0
    if (now - startedAt < minDurationMs) continue
    const item = torrents.find((t) => t.hash === hash)
    if (isPendingResolved(action, item?.state ?? '', item !== undefined)) {
      delete next[hash]
    }
  }
  return next
}

export class QbittorrentController extends BaseExtensionController<QbitState> {
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private lastAppliedDeeplinkPath: string | null = null
  private copiedTimer: ReturnType<typeof setTimeout> | null = null
  private pendingStartedAt: Record<string, number> = {}
  private pendingClearTimers = new Map<string, ReturnType<typeof setTimeout>>()

  constructor(onUpdate: () => void) {
    super(
      EXT_ID,
      {
        torrents: [],
        query: '',
        selectedIndex: -1,
        loading: false,
        error: null,
        connectionState: null,
        adding: false,
        addError: null,
        actionError: null,
        copiedHash: null,
        copiedKind: null,
        pendingActions: {},
      },
      onUpdate
    )
  }

  getPendingAction(hash: string): TorrentPendingAction | null {
    return this.state.pendingActions[hash] ?? null
  }

  isItemPending(hash: string): boolean {
    return hash in this.state.pendingActions
  }

  private setPending(hash: string, action: TorrentPendingAction): void {
    this.pendingStartedAt[hash] = Date.now()
    this.store.setState({
      pendingActions: { ...this.state.pendingActions, [hash]: action },
    })
    this.schedulePendingClear(hash)
    window.core?.shell?.refreshShellActions()
  }

  private schedulePendingClear(hash: string): void {
    const existing = this.pendingClearTimers.get(hash)
    if (existing) clearTimeout(existing)

    const startedAt = this.pendingStartedAt[hash]
    if (!startedAt) return

    const remaining = MIN_PENDING_MS - (Date.now() - startedAt)
    if (remaining <= 0) return

    const timer = setTimeout(() => {
      this.pendingClearTimers.delete(hash)
      void this.refresh()
    }, remaining)
    this.pendingClearTimers.set(hash, timer)
  }

  private clearPending(hash: string): void {
    const timer = this.pendingClearTimers.get(hash)
    if (timer) {
      clearTimeout(timer)
      this.pendingClearTimers.delete(hash)
    }
    delete this.pendingStartedAt[hash]
    if (!(hash in this.state.pendingActions)) return
    const pendingActions = { ...this.state.pendingActions }
    delete pendingActions[hash]
    this.store.setState({ pendingActions })
    window.core?.shell?.refreshShellActions()
  }

  get isAddMode(): boolean {
    return isTorrentLink(this.state.query)
  }

  get filteredTorrents(): TorrentItem[] {
    if (this.isAddMode) return []
    const q = this.state.query.trim().toLowerCase()
    const torrents = q
      ? this.state.torrents.filter((t) => t.name.toLowerCase().includes(q))
      : this.state.torrents
    return torrents.slice().sort((a, b) => a.name.localeCompare(b.name))
  }

  connect(): void {
    this.syncSearchPlaceholder()
    this.store.setState({ loading: true })
    void this.refresh()
    this.pollTimer = setInterval(() => void this.refresh(), POLL_INTERVAL_MS)
    this.bindActions()
  }

  disconnect(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    if (this.copiedTimer) clearTimeout(this.copiedTimer)
    for (const timer of this.pendingClearTimers.values()) clearTimeout(timer)
    this.pendingClearTimers.clear()
    this.pendingStartedAt = {}
    this.cleanups.forEach((fn) => fn())
    this.cleanups = []
    window.core?.shell?.registerShellActions(null)
    this.t.destroy()
  }

  syncSearchPlaceholder(): void {
    setToolSearchPlaceholder(this.t.t, 'search.placeholder')
  }

  setQuery(query: string): void {
    if (query === this.state.query) return
    this.store.setState({ query, selectedIndex: -1, addError: null, actionError: null })
    window.core?.shell?.refreshShellActions()
  }

  setSelectedIndex(index: number | ((prev: number) => number)): void {
    const prev = this.state.selectedIndex
    const next = typeof index === 'function' ? index(prev) : index
    this.store.setState({ selectedIndex: next })
    window.core?.shell?.refreshShellActions()
  }

  async refresh(): Promise<void> {
    try {
      const torrents = await invoke<TorrentItem[]>('list')
      this.store.setState({
        torrents,
        loading: false,
        error: null,
        connectionState: null,
        actionError: null,
        pendingActions: resolvePendingActions(
          this.state.pendingActions,
          torrents,
          this.pendingStartedAt
        ),
      })
    } catch (err) {
      if (err instanceof Error) {
        const mapped = mapQbitError(err)
        this.store.setState({
          loading: false,
          error: mapped.message,
          connectionState: mapped.state,
        })
      } else {
        this.store.setState({
          loading: false,
          error: 'Failed to load torrents',
          connectionState: 'error',
        })
      }
    }
    window.core?.shell?.refreshShellActions()
  }

  async addTorrent(url: string): Promise<void> {
    this.store.setState({ adding: true, addError: null })
    try {
      await invoke('add', { url })
      window.core?.shell?.controlOmniBar('clear')
      this.store.setState({ adding: false })
      await this.refresh()
    } catch (err) {
      this.store.setState({
        adding: false,
        addError: err instanceof Error ? err.message : 'Failed to add torrent',
      })
    }
  }

  /**
   * Handles the `nuxy://qbittorrent/add?url=...` deeplink. `path` is the
   * deeplink path+query suffix forwarded verbatim as `committedQuery`.
   * Idempotent for the same path so callers can retry on every `updated()`
   * cycle without double-adding the same torrent.
   */
  async applyDeeplinkPath(path: string): Promise<boolean> {
    const parsed = parseAddDeeplink(path)
    if (!parsed) return false
    if (this.lastAppliedDeeplinkPath === path) return true

    this.lastAppliedDeeplinkPath = path
    await this.addTorrent(parsed.url)
    return true
  }

  private async runTorrentAction(
    hash: string,
    channel: 'pause' | 'resume' | 'recheck' | 'reannounce'
  ): Promise<void> {
    const pendingAction: TorrentPendingAction =
      channel === 'pause' ? 'pause' : channel === 'resume' ? 'resume' : channel
    this.setPending(hash, pendingAction)
    try {
      await invoke(channel, { hash })
      await this.refresh()
    } catch (err) {
      this.clearPending(hash)
      this.store.setState({ actionError: err instanceof Error ? err.message : 'Action failed' })
      throw err
    }
  }

  async togglePause(item: TorrentItem): Promise<void> {
    await this.runTorrentAction(item.hash, isPausedState(item.state) ? 'resume' : 'pause')
  }

  async recheck(item: TorrentItem): Promise<void> {
    await this.runTorrentAction(item.hash, 'recheck')
  }

  async reannounce(item: TorrentItem): Promise<void> {
    await this.runTorrentAction(item.hash, 'reannounce')
  }

  async remove(item: TorrentItem, deleteFiles: boolean): Promise<void> {
    this.setPending(item.hash, 'remove')
    try {
      await invoke('remove', { hash: item.hash, deleteFiles })
    } catch (err) {
      this.clearPending(item.hash)
      this.store.setState({ actionError: err instanceof Error ? err.message : 'Action failed' })
      throw err
    }

    const remainingCount = this.filteredTorrents.length - 1
    await this.refresh()
    if (remainingCount <= 0) {
      this.store.setState({ selectedIndex: -1 })
      return
    }
    this.setSelectedIndex((prev) => Math.min(prev, remainingCount - 1))
  }

  async copyMagnet(item: TorrentItem): Promise<void> {
    await invoke('copyMagnet', { magnetUri: item.magnetUri })
    this.flashCopied(item.hash, 'magnet')
  }

  async copySavePath(item: TorrentItem): Promise<void> {
    await invoke('copySavePath', { savePath: item.savePath })
    this.flashCopied(item.hash, 'savePath')
  }

  async openSavePath(item: TorrentItem): Promise<void> {
    await invoke('openSavePath', { savePath: item.savePath })
  }

  private flashCopied(hash: string, kind: CopiedKind): void {
    this.store.setState({ copiedHash: hash, copiedKind: kind })
    if (this.copiedTimer) clearTimeout(this.copiedTimer)
    this.copiedTimer = setTimeout(
      () => this.store.setState({ copiedHash: null, copiedKind: null }),
      1500
    )
  }

  getKeyActions(): ShellAction[] {
    return this.buildActions()
  }

  private bindActions(): void {
    window.core?.shell?.registerShellActions(() => this.buildActions())
    this.cleanups.push(() => {
      window.core?.shell?.registerShellActions(null)
    })
  }

  private buildActions(): ShellAction[] {
    const t = this.t.t

    if (this.isAddMode) {
      return [
        {
          id: 'qbit-add',
          key: 'Enter',
          label: t('actions.addTorrent'),
          hint: '↵',
          activeOn: () => this.isAddMode && !this.state.adding,
          handler: () => void this.addTorrent(this.state.query.trim()),
        },
      ]
    }

    const items = this.filteredTorrents
    const { selectedIndex } = this.state
    const selected = selectedIndex >= 0 ? items[selectedIndex] : null

    return [
      pairedKeyAction({
        id: 'qbit-navigate',
        label: t('actions.navigate'),
        allowRepeat: true,
        activeOn: () => items.length > 0,
        negative: () => {
          this.setSelectedIndex((prev) => {
            if (prev <= 0) {
              window.core?.shell?.controlOmniBar('show')
              return -1
            }
            return prev - 1
          })
        },
        positive: () => {
          this.setSelectedIndex((prev) => {
            if (prev + 1 < items.length) {
              if (prev === -1) window.core?.shell?.controlOmniBar('hide')
              return prev + 1
            }
            return prev
          })
        },
      }),
      {
        id: 'qbit-toggle-pause',
        key: 'Enter',
        label:
          selected && isCompletedTorrent(selected)
            ? t('actions.openFolder')
            : selected && isPausedState(selected.state)
              ? t('actions.resume')
              : t('actions.pause'),
        hint: '↵',
        activeOn: () =>
          !!selected &&
          !this.isItemPending(selected.hash) &&
          (!isCompletedTorrent(selected) || !!selected.savePath),
        handler: () => {
          if (!selected) return
          if (isCompletedTorrent(selected)) {
            void this.openSavePath(selected)
            return
          }
          void this.togglePause(selected)
        },
      },
      {
        id: 'qbit-copy-magnet',
        key: 'c',
        label: t('actions.copyMagnet'),
        section: 'actions',
        showInMenu: !!selected,
        activeOn: () => !!selected && !this.isItemPending(selected.hash),
        handler: () => selected && void this.copyMagnet(selected),
      },
      {
        id: 'qbit-copy-save-path',
        key: 'c',
        modifiers: ['shift'],
        label: t('actions.copySavePath'),
        section: 'actions',
        showInMenu: !!selected,
        activeOn: () => !!selected && !this.isItemPending(selected.hash),
        handler: () => selected && void this.copySavePath(selected),
      },
      {
        id: 'qbit-open-folder',
        key: 'o',
        label: t('actions.openFolder'),
        section: 'actions',
        showInMenu: !!selected,
        activeOn: () => !!selected && !this.isItemPending(selected.hash) && !!selected.savePath,
        handler: () => selected && void this.openSavePath(selected),
      },
      {
        id: 'qbit-recheck',
        key: 'r',
        label: t('actions.recheck'),
        section: 'actions',
        showInMenu: !!selected,
        activeOn: () => !!selected && !this.isItemPending(selected.hash),
        handler: () => selected && void this.recheck(selected),
      },
      {
        id: 'qbit-reannounce',
        key: 'r',
        modifiers: ['shift'],
        label: t('actions.reannounce'),
        section: 'actions',
        showInMenu: !!selected,
        activeOn: () => !!selected && !this.isItemPending(selected.hash),
        handler: () => selected && void this.reannounce(selected),
      },
      {
        id: 'qbit-remove',
        key: 'Delete',
        label: t('actions.removeKeepData'),
        trigger: 'hold',
        holdCancelToast: t('actions.removeKeepData'),
        section: 'actions',
        showInMenu: !!selected,
        activeOn: () => !!selected && !this.isItemPending(selected.hash),
        handler: () => selected && void this.remove(selected, false),
      },
      {
        id: 'qbit-remove-with-data',
        key: 'Delete',
        modifiers: ['shift'],
        label: t('actions.removeWithData'),
        trigger: 'hold',
        holdCancelToast: t('actions.removeWithData'),
        section: 'actions',
        showInMenu: !!selected,
        activeOn: () => !!selected && !this.isItemPending(selected.hash),
        handler: () => selected && void this.remove(selected, true),
      },
    ]
  }
}
