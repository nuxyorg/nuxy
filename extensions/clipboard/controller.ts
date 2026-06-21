import type { ShellAction } from '@nuxyorg/core'
import { setToolSearchPlaceholder, BaseExtensionController } from '@nuxyorg/extension-sdk'
import type { ClipboardItem } from './types.ts'
import { getItemType } from './utils/item-type.ts'

const EXT_ID = 'com.nuxy.clipboard'
const DEFAULT_REFRESH_INTERVAL_MS = 1000
const COPIED_RESET_MS = 1800

export interface ClipboardState {
  items: ClipboardItem[]
  query: string
  selectedIndex: number
  copiedId: string | null
  imageDimensions: string | null
  fileExists: boolean | null
}

export class ClipboardController extends BaseExtensionController<ClipboardState> {
  private refreshTimer: ReturnType<typeof setInterval> | null = null
  private copiedTimer: ReturnType<typeof setTimeout> | null = null

  constructor(onUpdate: () => void) {
    super(
      EXT_ID,
      {
        items: [],
        query: '',
        selectedIndex: -1,
        copiedId: null,
        imageDimensions: null,
        fileExists: null,
      },
      onUpdate
    )
  }

  connect(): void {
    if (!window.core?.ipc) return
    this.syncSearchPlaceholder()
    this.loadHistory()
    this.startRefreshTimer(DEFAULT_REFRESH_INTERVAL_MS)
    this.syncRefreshIntervalFromBackend()
    this.bindKeyboard()
  }

  private startRefreshTimer(intervalMs: number): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer)
    this.refreshTimer = setInterval(() => this.loadHistory(), intervalMs)
  }

  /**
   * Never poll faster than the backend's own clipboard-read cadence — doing
   * so just doubles work without surfacing new clips any sooner.
   */
  private syncRefreshIntervalFromBackend(): void {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'getPollIntervalMs')
      .then((res) => {
        const r = res as { success: boolean; data?: number } | null
        if (r?.success && typeof r.data === 'number' && r.data > 0) {
          this.startRefreshTimer(Math.max(r.data, DEFAULT_REFRESH_INTERVAL_MS))
        }
      })
      .catch(() => {})
  }

  disconnect(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer)
    if (this.copiedTimer) clearTimeout(this.copiedTimer)
    this.cleanups.forEach((fn) => fn())
    this.cleanups = []
    this.t.destroy()
    window.core?.shell?.registerShellActions(null)
    this.syncOmniBar('show')
  }

  syncSearchPlaceholder(): void {
    setToolSearchPlaceholder(this.t.t, 'search.placeholder')
  }

  setQuery(query: string): void {
    if (this.state.query === query) return
    this.store.setState({ query, selectedIndex: -1 })
    this.syncOmniBar('show')
    this.resetSelectedItemMeta()
    window.core?.shell?.refreshShellActions()
  }

  setSelectedIndex(index: number | ((prev: number) => number)): void {
    const prev = this.state.selectedIndex
    const next = typeof index === 'function' ? index(prev) : index
    this.store.setState({ selectedIndex: next })
    this.syncOmniBar(next >= 0 ? 'hide' : 'show')
    this.resetSelectedItemMeta()
    this.loadSelectedItemMeta()
    window.core?.shell?.refreshShellActions()
  }

  get filteredItems(): ClipboardItem[] {
    const { items, query } = this.state
    if (!query.trim()) return items
    const q = query.toLowerCase()
    return items.filter((item) => item.text?.toLowerCase().includes(q))
  }

  get selectedItem(): ClipboardItem | null {
    const { selectedIndex } = this.state
    const filtered = this.filteredItems
    return selectedIndex >= 0 ? (filtered[selectedIndex] ?? null) : null
  }

  handleCopy(id: string): void {
    this.ipcMutate('copyItem', id).then(() => {
      this.markCopied(id)
    })
  }

  handleCopyFile(id: string): void {
    this.ipcMutate('copyFile', id).then(() => {
      this.markCopied(id)
    })
  }

  handlePin(id: string): void {
    void this.ipcMutate('pinItem', id)
  }

  handleUnpin(id: string): void {
    void this.ipcMutate('unpinItem', id)
  }

  handleDelete(id: string): void {
    this.ipcMutate('deleteItem', id).then((newItems) => {
      const { selectedIndex, query } = this.state
      if (selectedIndex < 0) return
      const newLen = query.trim()
        ? newItems.filter((i) => i.text?.toLowerCase().includes(query.toLowerCase())).length
        : newItems.length
      const next = newLen === 0 ? -1 : Math.min(selectedIndex, newLen - 1)
      this.setSelectedIndex(next)
    })
  }

  handleClearHistory(): void {
    void this.ipcMutate('clearHistory', undefined)
  }

  private markCopied(id: string): void {
    this.store.setState({ copiedId: id })
    if (this.copiedTimer) clearTimeout(this.copiedTimer)
    this.copiedTimer = setTimeout(() => {
      this.store.setState({ copiedId: null })
    }, COPIED_RESET_MS)
    setTimeout(() => window.core?.window?.hide?.(), 150)
  }

  private loadHistory(): void {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'getHistory')
      .then((res) => {
        const r = res as { success: boolean; data?: ClipboardItem[] } | null
        if (!r?.success) return
        const newData = r.data ?? []
        const prev = this.state.items
        const unchanged =
          prev.length === newData.length &&
          prev.every(
            (item, i) =>
              item.id === newData[i].id &&
              item.copiedAt === newData[i].copiedAt &&
              item.pinned === newData[i].pinned
          )
        if (!unchanged) this.store.setState({ items: newData })
      })
      .catch(() => {})
  }

  private ipcMutate(channel: string, payload: string | undefined): Promise<ClipboardItem[]> {
    if (!window.core?.ipc?.invoke) return Promise.resolve(this.state.items)
    return window.core.ipc
      .invoke(EXT_ID, channel, payload)
      .then((res) => {
        const r = res as { success: boolean; data?: ClipboardItem[] } | null
        if (r?.success) this.store.setState({ items: r.data ?? [] })
        return r?.data ?? []
      })
      .catch(() => [])
  }

  private resetSelectedItemMeta(): void {
    this.store.setState({ imageDimensions: null, fileExists: null })
  }

  private loadSelectedItemMeta(): void {
    const item = this.selectedItem
    if (!item) return

    if (item.image) {
      const img = new Image()
      img.onload = () => {
        this.store.setState({ imageDimensions: `${img.width} × ${img.height}` })
      }
      img.src = item.image
    }

    if (getItemType(item) === 'file' && window.core?.ipc?.invoke) {
      window.core.ipc
        .invoke(EXT_ID, 'checkFile', item.text?.trim())
        .then((res) => {
          const r = res as { success: boolean; data?: boolean } | null
          if (r?.success) this.store.setState({ fileExists: !!r.data })
        })
        .catch(() => this.store.setState({ fileExists: false }))
    }
  }

  private syncOmniBar(action: 'show' | 'hide'): void {
    window.core?.shell?.controlOmniBar(action)
  }

  getKeyActions(): ShellAction[] {
    return this.buildActions()
  }

  private buildActions(): ShellAction[] {
    const { selectedIndex } = this.state
    const t = this.t.t
    const filtered = this.filteredItems
    const selected = this.selectedItem

    return [
      {
        id: 'clipboard-navigate-up',
        key: 'ArrowUp',
        label: t('actions.navigate'),
        hint: '↑↓',
        handler: () => {
          if (filtered.length === 0) return
          this.setSelectedIndex((prev) => (prev <= 0 ? -1 : prev - 1))
        },
      },
      {
        id: 'clipboard-navigate-down',
        key: 'ArrowDown',
        label: t('actions.nextItem'),
        handler: () => {
          if (filtered.length === 0) return
          this.setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1))
        },
      },
      {
        id: 'clipboard-copy',
        key: 'Enter',
        label: t('actions.copy'),
        hint: '↵',
        activeOn: () => selectedIndex >= 0,
        handler: () => {
          const item = this.selectedItem
          if (!item) return
          if (getItemType(item) === 'file') this.handleCopyFile(item.id)
          else this.handleCopy(item.id)
        },
      },
      {
        id: 'clipboard-pin-unpin',
        key: 'p',
        modifiers: ['ctrl'],
        label: selected?.pinned ? t('actions.unpinSelected') : t('actions.pinSelected'),
        section: 'actions',
        showInMenu: selectedIndex >= 0,
        activeOn: () => selectedIndex >= 0,
        handler: () => {
          const item = this.selectedItem
          if (!item) return
          if (item.pinned) this.handleUnpin(item.id)
          else this.handlePin(item.id)
        },
      },
      {
        id: 'clipboard-delete',
        key: 'Delete',
        label: t('actions.deleteSelected'),
        hint: 'Del',
        activeOn: () => selectedIndex >= 0,
        handler: () => {
          const item = this.selectedItem
          if (item) this.handleDelete(item.id)
        },
      },
    ]
  }

  private bindKeyboard(): void {
    window.core?.shell?.registerShellActions(() => this.buildActions())
    this.cleanups.push(() => {
      window.core?.shell?.registerShellActions(null)
    })
  }
}
