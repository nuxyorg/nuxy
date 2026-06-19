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
}

export class DownloadManagerController extends BaseExtensionController<DownloadManagerState> {
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private lastAppliedDeeplinkPath: string | null = null

  constructor(onUpdate: () => void) {
    super(EXT_ID, { items: [], selectedIndex: -1 }, onUpdate)
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
    window.core?.shell?.registerKeyActions(null)
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

  private bindKeyActions(): void {
    window.core?.shell?.registerKeyActions(() => this.buildKeyActions())
  }

  private buildKeyActions(): ShellKeyAction[] {
    const t = this.t.t
    const { items, selectedIndex } = this.state
    const selected = selectedIndex >= 0 ? items[selectedIndex] : null

    return [
      {
        key: 'ArrowUp',
        label: t('actions.previous'),
        hint: '↑↓',
        allowRepeat: true,
        handler: () => this.setSelectedIndex((i) => Math.max(-1, i - 1)),
      },
      {
        key: 'ArrowDown',
        label: t('actions.next'),
        allowRepeat: true,
        handler: () => this.setSelectedIndex((i) => Math.min(i + 1, items.length - 1)),
      },
      {
        key: 'p',
        label: t('actions.pause'),
        hint: 'P',
        activeOn: () => selected?.status === 'downloading',
        handler: () => selected && void this.pause(selected.id),
      },
      {
        key: 'r',
        label: t('actions.resume'),
        hint: 'R',
        activeOn: () => selected?.status === 'paused' || selected?.status === 'failed',
        handler: () => selected && void this.resume(selected.id),
      },
      {
        key: 'x',
        label: t('actions.cancel'),
        hint: 'X',
        activeOn: () =>
          selected?.status === 'downloading' ||
          selected?.status === 'paused' ||
          selected?.status === 'queued',
        handler: () => selected && void this.cancel(selected.id),
      },
      {
        key: 'Delete',
        label: t('actions.remove'),
        hint: 'Del',
        activeOn: () =>
          selected?.status === 'completed' ||
          selected?.status === 'cancelled' ||
          selected?.status === 'failed',
        handler: () => selected && void this.remove(selected.id),
      },
    ]
  }
}
