import { setToolSearchPlaceholder, BaseExtensionController } from '@nuxyorg/extension-sdk'
import type { ShellAction } from '@nuxyorg/core'
import { logCaughtError } from '@nuxyorg/core'
import { pairedKeyAction } from '../ui-default/src/hooks/paired-key-action.ts'
import { invoke } from './utils/ipc.ts'
import { parseAddDeeplink } from './utils/parse-deeplink.ts'
import type { DownloadItem } from './types.ts'

const EXT_ID = 'com.nuxy.download-manager'
const POLL_INTERVAL_MS = 1000

export interface DownloadManagerState {
  items: DownloadItem[]
  query: string
  selectedIndex: number
  multiSelectMode: boolean
  checkedIds: Set<string>
}

export class DownloadManagerController extends BaseExtensionController<DownloadManagerState> {
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private lastAppliedDeeplinkPath: string | null = null

  constructor(onUpdate: () => void) {
    super(
      EXT_ID,
      {
        items: [],
        query: '',
        selectedIndex: -1,
        multiSelectMode: false,
        checkedIds: new Set(),
      },
      onUpdate
    )
  }

  get filteredItems(): DownloadItem[] {
    const q = this.state.query.trim().toLowerCase()
    const items = q
      ? this.state.items.filter((item) => item.fileName.toLowerCase().includes(q))
      : this.state.items
    return items.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  setQuery(query: string): void {
    if (query === this.state.query) return
    this.store.setState({ query, selectedIndex: -1 })
    window.core?.shell?.refreshShellActions()
  }

  connect(): void {
    this.syncSearchPlaceholder()
    void this.refresh()
    this.pollTimer = setInterval(() => void this.refresh(), POLL_INTERVAL_MS)
    this.bindActions()
  }

  disconnect(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    this.cleanups.forEach((fn) => fn())
    this.cleanups = []
    window.core?.shell?.registerShellActions(null)
    this.t.destroy()
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
    const items = this.filteredItems
    const selectedIndex =
      val && this.state.selectedIndex < 0 && items.length > 0 ? 0 : this.state.selectedIndex
    this.store.setState({
      multiSelectMode: val,
      checkedIds: val ? this.state.checkedIds : new Set(),
      selectedIndex,
    })
    window.core?.shell?.refreshShellActions()
  }

  selectAll(): void {
    const ids = new Set(this.filteredItems.map((item) => item.id))
    this.store.setState({ checkedIds: ids })
    window.core?.shell?.refreshShellActions()
  }

  enterMultiSelectAndSelectAll(): void {
    const items = this.filteredItems
    if (items.length === 0) return
    const selectedIndex = this.state.selectedIndex < 0 ? 0 : this.state.selectedIndex
    this.store.setState({
      multiSelectMode: true,
      selectedIndex,
      checkedIds: new Set(items.map((item) => item.id)),
    })
    window.core?.shell?.refreshShellActions()
  }

  handleSpace(): void {
    const items = this.filteredItems
    if (items.length === 0) return

    const { multiSelectMode, selectedIndex } = this.state
    const index = selectedIndex < 0 ? 0 : selectedIndex
    const item = items[index]
    if (!item) return

    if (!multiSelectMode) {
      this.store.setState({
        multiSelectMode: true,
        selectedIndex: index,
        checkedIds: new Set([item.id]),
      })
      window.core?.shell?.refreshShellActions()
      return
    }

    this.toggleCheck(item.id)
  }

  async refresh(): Promise<void> {
    const items = await invoke<DownloadItem[]>('list').catch((err) => {
      logCaughtError(EXT_ID, err, 'list')
      return null
    })
    if (!items) return

    const next: Partial<DownloadManagerState> = { items }
    if (items.length === 0) {
      next.multiSelectMode = false
      next.checkedIds = new Set()
      next.selectedIndex = -1
    }
    this.store.setState(next)
    window.core?.shell?.refreshShellActions()
  }

  async addUrl(url: string, fileName?: string): Promise<DownloadItem> {
    const item = await invoke<DownloadItem>('add', { url, fileName })
    await this.refresh()
    return item
  }

  async pause(id: string): Promise<void> {
    await invoke('pause', { id })
    await this.refresh()
  }

  async resume(id: string): Promise<void> {
    await invoke('resume', { id })
    await this.refresh()
  }

  async cancel(id: string): Promise<void> {
    await invoke('cancel', { id })
    await this.refresh()
  }

  async remove(id: string): Promise<void> {
    await invoke('remove', { id })
    await this.refresh()
  }

  /**
   * Handles the `nuxy://download-manager/add?url=...` deeplink. `path` is the
   * deeplink path+query suffix forwarded verbatim as `committedQuery`
   * (e.g. "add?url=https%3A%2F%2F..."). Mirrors
   * SettingsController.selectPanelFromDeeplinkPath: returns whether the path
   * matched and was applied, is a no-op for any other path shape, and is
   * idempotent for the same path so callers can safely retry on every
   * `updated()` cycle without double-queuing the same download.
   */
  async applyDeeplinkPath(path: string): Promise<boolean> {
    const parsed = parseAddDeeplink(path)
    if (!parsed) return false
    if (this.lastAppliedDeeplinkPath === path) return true

    this.lastAppliedDeeplinkPath = path
    await this.addUrl(parsed.url, parsed.fileName)
    return true
  }

  async openFile(id: string): Promise<void> {
    await invoke('openFile', { id })
  }

  async openFolder(id: string): Promise<void> {
    await invoke('openFolder', { id })
  }

  async handleRemove(): Promise<void> {
    const { selectedIndex } = this.state
    const filteredItems = this.filteredItems
    const selected = selectedIndex >= 0 ? filteredItems[selectedIndex] : null
    if (!selected) return

    const remainingCount = filteredItems.length - 1
    if (
      selected.status === 'downloading' ||
      selected.status === 'paused' ||
      selected.status === 'queued'
    ) {
      await this.cancel(selected.id)
    }
    await this.remove(selected.id)

    if (remainingCount === 0) {
      this.store.setState({ selectedIndex: -1, multiSelectMode: false, checkedIds: new Set() })
      window.core?.shell?.controlOmniBar('show')
      window.core?.shell?.refreshShellActions()
      return
    }

    this.setSelectedIndex((prev) => Math.min(prev, remainingCount - 1))
  }

  async handleRemoveSelected(): Promise<void> {
    const { items, checkedIds } = this.state
    const ids = items.filter((item) => checkedIds.has(item.id)).map((item) => item.id)
    if (ids.length === 0) return

    for (const id of ids) {
      const item = items.find((i) => i.id === id)
      if (!item) continue
      if (item.status === 'downloading' || item.status === 'paused' || item.status === 'queued') {
        await this.cancel(id)
      }
      await this.remove(id)
    }

    const remainingCount = this.filteredItems.length
    this.store.setState({ multiSelectMode: false, checkedIds: new Set() })

    if (remainingCount === 0) {
      this.store.setState({ selectedIndex: -1 })
      window.core?.shell?.controlOmniBar('show')
      window.core?.shell?.refreshShellActions()
      return
    }

    this.setSelectedIndex((prev) => Math.min(prev, remainingCount - 1))
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

  /**
   * Single source of truth for both the footer (actions with a `hint`) and
   * the Ctrl+K palette (actions with `showInMenu: true`). The two are
   * mutually exclusive per action: the footer only has room for the
   * frequent, single-item operations — anything that doesn't fit there
   * (bulk multi-select operations) is Ctrl+K-only, with its key binding
   * still live in the background.
   */
  private buildActions(): ShellAction[] {
    const t = this.t.t
    const { selectedIndex, multiSelectMode, checkedIds } = this.state
    const items = this.filteredItems
    const selected = selectedIndex >= 0 ? items[selectedIndex] : null
    const isFailed = selected?.status === 'failed'

    const enterLabel = isFailed
      ? t('actions.retry')
      : selected?.status === 'downloading'
        ? t('actions.pause')
        : selected?.status === 'paused'
          ? t('actions.resume')
          : t('actions.openFile')

    const spaceLabel = t('actions.checkToggle')

    const canOpenFolder =
      !multiSelectMode &&
      !!selected &&
      selected.status !== 'failed' &&
      selected.status !== 'downloading' &&
      selected.status !== 'paused'

    return [
      {
        id: 'dm-select-all',
        key: 'a',
        modifiers: ['ctrl'],
        label: t('actions.selectAll'),
        section: 'actions',
        showInMenu: items.length > 0,
        activeOn: () => items.length > 0,
        handler: () => this.enterMultiSelectAndSelectAll(),
      },
      {
        id: 'dm-space',
        key: ' ',
        label: spaceLabel,
        hint: 'Space',
        activeOn: () => items.length > 0,
        handler: () => this.handleSpace(),
      },
      {
        id: 'dm-exit-select',
        key: 'Escape',
        label: t('actions.exitSelectMultiple'),
        hint: 'Esc',
        activeOn: () => multiSelectMode,
        handler: () => this.setMultiSelectMode(false),
      },
      {
        id: 'dm-remove-selected',
        key: 'Delete',
        label: t('actions.removeSelected'),
        hint: 'Del',
        trigger: 'hold',
        holdCancelToast: t('actions.removeSelected'),
        section: 'actions',
        showInMenu: multiSelectMode && checkedIds.size > 0,
        activeOn: () => multiSelectMode && checkedIds.size > 0,
        handler: () => void this.handleRemoveSelected(),
      },
      pairedKeyAction({
        id: 'dm-navigate',
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
        id: 'dm-enter',
        key: 'Enter',
        label: enterLabel,
        hint: '↵',
        activeOn: () => !multiSelectMode && selectedIndex >= 0 && selectedIndex < items.length,
        handler: () => {
          const item = items[selectedIndex]
          if (!item) return
          if (item.status === 'failed') {
            void this.resume(item.id)
            return
          }
          if (item.status === 'downloading') {
            void this.pause(item.id)
            return
          }
          if (item.status === 'paused') {
            void this.resume(item.id)
            return
          }
          void this.openFile(item.id)
        },
      },
      {
        id: 'dm-open-folder',
        key: 'Enter',
        modifiers: ['shift'],
        label: t('actions.openFolder'),
        section: 'actions',
        showInMenu: canOpenFolder,
        activeOn: () => {
          const { selectedIndex: idx, multiSelectMode: multi } = this.state
          const currentItems = this.filteredItems
          if (multi || idx < 0 || idx >= currentItems.length) return false
          const status = currentItems[idx]?.status
          return status !== 'failed' && status !== 'downloading' && status !== 'paused'
        },
        handler: () => {
          const item = items[selectedIndex]
          if (item) void this.openFolder(item.id)
        },
      },
      {
        id: 'dm-remove',
        key: 'Delete',
        label: t('actions.holdDeleteToRemove'),
        hint: 'Del',
        trigger: 'hold',
        holdCancelToast: t('actions.holdDeleteToRemove'),
        activeOn: () => !multiSelectMode && selectedIndex >= 0 && selectedIndex < items.length,
        handler: () => void this.handleRemove(),
      },
      {
        id: 'dm-cancel',
        key: 'x',
        label: t('actions.cancel'),
        hint: 'X',
        activeOn: () =>
          !multiSelectMode &&
          (selected?.status === 'downloading' ||
            selected?.status === 'paused' ||
            selected?.status === 'queued'),
        handler: () => selected && void this.cancel(selected.id),
      },
    ]
  }
}
