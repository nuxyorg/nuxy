import { setToolSearchPlaceholder, BaseExtensionController } from '@nuxyorg/extension-sdk'
import type { ShellKeyAction } from '@nuxyorg/core'
import { invoke } from './utils/ipc.ts'
import { parseAddDeeplink } from './utils/parseDeeplink.ts'
import type { DownloadItem } from './types.ts'

const EXT_ID = 'com.nuxy.download-manager'
const POLL_INTERVAL_MS = 1000

export interface DownloadManagerState {
  items: DownloadItem[]
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
      { items: [], selectedIndex: -1, multiSelectMode: false, checkedIds: new Set() },
      onUpdate
    )
  }

  connect(): void {
    this.syncSearchPlaceholder()
    void this.refresh()
    this.pollTimer = setInterval(() => void this.refresh(), POLL_INTERVAL_MS)
    this.bindKeyActions()
  }

  disconnect(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    this.cleanups.forEach((fn) => fn())
    this.cleanups = []
    window.core?.shell?.registerKeyActions(null)
    window.core?.shell?.registerActions([])
    this.t.destroy()
  }

  syncSearchPlaceholder(): void {
    setToolSearchPlaceholder(this.t.t, 'search.placeholder')
  }

  setSelectedIndex(index: number | ((prev: number) => number)): void {
    const prev = this.state.selectedIndex
    const next = typeof index === 'function' ? index(prev) : index
    this.store.setState({ selectedIndex: next })
    window.core?.shell?.refreshKeyHints()
  }

  toggleCheck(id: string): void {
    const next = new Set(this.state.checkedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    this.store.setState({ checkedIds: next })
    window.core?.shell?.refreshKeyHints()
  }

  setMultiSelectMode(val: boolean): void {
    this.store.setState({
      multiSelectMode: val,
      checkedIds: val ? this.state.checkedIds : new Set(),
    })
    window.core?.shell?.refreshKeyHints()
  }

  async refresh(): Promise<void> {
    const items = await invoke<DownloadItem[]>('list').catch(() => null)
    if (items) this.store.setState({ items })
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
    const { items, selectedIndex } = this.state
    const selected = selectedIndex >= 0 ? items[selectedIndex] : null
    if (!selected) return

    const remainingCount = items.length - 1
    if (
      selected.status === 'downloading' ||
      selected.status === 'paused' ||
      selected.status === 'queued'
    ) {
      await this.cancel(selected.id)
    }
    await this.remove(selected.id)

    if (remainingCount === 0) {
      this.store.setState({ selectedIndex: -1 })
      window.core?.shell?.controlOmniBar('show')
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

    const remainingCount = this.state.items.length
    this.store.setState({ multiSelectMode: false, checkedIds: new Set() })

    if (remainingCount === 0) {
      this.store.setState({ selectedIndex: -1 })
      window.core?.shell?.controlOmniBar('show')
      return
    }

    this.setSelectedIndex((prev) => Math.min(prev, remainingCount - 1))
  }

  getKeyActions(): ShellKeyAction[] {
    return this.buildKeyActions()
  }

  private bindKeyActions(): void {
    window.core?.shell?.registerKeyActions(() => this.buildKeyActions())
    this.store.subscribe(() => this.registerShellActions())
    this.cleanups.push(() => {
      window.core?.shell?.registerActions([])
    })
  }

  private registerShellActions(): void {
    const { items, selectedIndex, multiSelectMode, checkedIds } = this.state
    const t = this.t.t
    const actions: Array<{ id: string; label: string; section?: string; onExecute: () => void }> =
      []

    if (!multiSelectMode) {
      if (items.length > 0) {
        actions.push({
          id: 'dm-select-multiple',
          label: t('actions.selectMultiple'),
          section: 'actions',
          onExecute: () => this.setMultiSelectMode(true),
        })
      }
    } else {
      actions.push({
        id: 'dm-exit-select',
        label: t('actions.exitSelectMultiple'),
        section: 'actions',
        onExecute: () => this.setMultiSelectMode(false),
      })
      if (checkedIds.size > 0) {
        actions.push({
          id: 'dm-remove-selected',
          label: t('actions.removeSelected'),
          section: 'actions',
          onExecute: () => void this.handleRemoveSelected(),
        })
      }
    }

    const selected = selectedIndex >= 0 ? items[selectedIndex] : null
    if (!multiSelectMode && selected) {
      if (selected.status === 'downloading') {
        actions.push({
          id: 'dm-pause',
          label: t('actions.pause'),
          section: 'actions',
          onExecute: () => void this.pause(selected.id),
        })
      }
      if (selected.status === 'paused') {
        actions.push({
          id: 'dm-resume',
          label: t('actions.resume'),
          section: 'actions',
          onExecute: () => void this.resume(selected.id),
        })
      }
      if (selected.status === 'failed') {
        actions.push({
          id: 'dm-retry',
          label: t('actions.retry'),
          section: 'actions',
          onExecute: () => void this.resume(selected.id),
        })
      }
      if (
        selected.status === 'downloading' ||
        selected.status === 'paused' ||
        selected.status === 'queued'
      ) {
        actions.push({
          id: 'dm-cancel',
          label: t('actions.cancel'),
          section: 'actions',
          onExecute: () => void this.cancel(selected.id),
        })
      }
      actions.push({
        id: 'dm-remove',
        label: t('actions.remove'),
        section: 'actions',
        onExecute: () => void this.handleRemove(),
      })
    }

    window.core?.shell?.registerActions(actions)
  }

  private buildKeyActions(): ShellKeyAction[] {
    const t = this.t.t
    const { items, selectedIndex, multiSelectMode } = this.state
    const selected = selectedIndex >= 0 ? items[selectedIndex] : null
    const isFailed = selected?.status === 'failed'

    const enterLabel = multiSelectMode
      ? t('actions.checkToggle')
      : isFailed
        ? t('actions.retry')
        : t('actions.openFile')

    return [
      {
        key: 'ArrowUp',
        label: t('actions.previous'),
        hint: '↑↓',
        allowRepeat: true,
        activeOn: () => items.length > 0,
        handler: () => {
          this.setSelectedIndex((prev) => {
            if (prev <= 0) {
              window.core?.shell?.controlOmniBar('show')
              return -1
            }
            return prev - 1
          })
        },
      },
      {
        key: 'ArrowDown',
        label: t('actions.next'),
        allowRepeat: true,
        activeOn: () => items.length > 0,
        handler: () => {
          this.setSelectedIndex((prev) => {
            if (prev + 1 < items.length) {
              if (prev === -1) window.core?.shell?.controlOmniBar('hide')
              return prev + 1
            }
            return prev
          })
        },
      },
      {
        key: 'Enter',
        label: enterLabel,
        hint: '↵',
        activeOn: () => selectedIndex >= 0 && selectedIndex < items.length,
        handler: () => {
          const item = items[selectedIndex]
          if (!item) return
          if (multiSelectMode) {
            this.toggleCheck(item.id)
            return
          }
          if (item.status === 'failed') {
            void this.resume(item.id)
            return
          }
          void this.openFile(item.id)
        },
      },
      {
        key: 'Enter',
        modifiers: ['shift'],
        label: t('actions.openFolder'),
        hint: ['⇧', '↵'],
        activeOn: () => {
          const { items: currentItems, selectedIndex: idx, multiSelectMode: multi } = this.state
          if (multi || idx < 0 || idx >= currentItems.length) return false
          return currentItems[idx]?.status !== 'failed'
        },
        handler: () => {
          const item = items[selectedIndex]
          if (item) void this.openFolder(item.id)
        },
      },
      {
        key: 'Delete',
        label: 'Hold Del to remove',
        hint: 'Del',
        trigger: 'hold',
        holdCancelToast: 'Hold Del to remove',
        activeOn: () => !multiSelectMode && selectedIndex >= 0 && selectedIndex < items.length,
        handler: () => void this.handleRemove(),
      },
      {
        key: 'p',
        label: t('actions.pause'),
        hint: 'P',
        activeOn: () => !multiSelectMode && selected?.status === 'downloading',
        handler: () => selected && void this.pause(selected.id),
      },
      {
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
