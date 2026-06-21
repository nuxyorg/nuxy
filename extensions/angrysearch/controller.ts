import type { ShellAction } from '@nuxyorg/core'
import { setToolSearchPlaceholder, BaseExtensionController } from '@nuxyorg/extension-sdk'
import type { TypedInvoker } from '@nuxyorg/extension-sdk'
import type { AngrysearchItem, DbStatus, IpcChannels } from './types.ts'

const EXT_ID = 'com.nuxy.angrysearch'
const MIN_QUERY_LENGTH = 3
const SEARCH_DEBOUNCE_MS = 150
const STATUS_POLL_MS = 2000

export interface AngrysearchState {
  query: string
  items: AngrysearchItem[]
  status: DbStatus | null
  regexMode: boolean
  selectedIndex: number
}

export class AngrysearchController extends BaseExtensionController<AngrysearchState> {
  private searchTimer: ReturnType<typeof setTimeout> | null = null
  private statusPollTimer: ReturnType<typeof setInterval> | null = null
  private searchGen = 0

  private invoke: TypedInvoker<IpcChannels> = async (channel, ...args) => {
    const res = (await window.core.ipc.invoke(EXT_ID, channel, args[0])) as {
      success: boolean
      data?: unknown
      error?: string
    } | null
    if (!res?.success) throw new Error(res?.error ?? 'IPC failed')
    return res.data as never
  }

  constructor(onUpdate: () => void) {
    super(
      EXT_ID,
      {
        query: '',
        items: [],
        status: null,
        regexMode: false,
        selectedIndex: -1,
      },
      onUpdate
    )
  }

  connect(): void {
    if (!window.core?.ipc) return
    this.syncSearchPlaceholder()

    this.invoke('getStatus')
      .then((status) => {
        this.store.setState({ status })
        if (status.isUpdating) this.startStatusPoll()
      })
      .catch(() => {})

    this.bindKeyboard()
  }

  disconnect(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer)
    this.stopStatusPoll()
    this.cleanups.forEach((fn) => fn())
    this.cleanups = []
    this.t.destroy()
    window.core?.shell?.registerShellActions(null)
  }

  syncSearchPlaceholder(): void {
    setToolSearchPlaceholder(this.t.t, 'search.placeholder')
  }

  setQuery(query: string): void {
    if (this.state.query === query) return
    this.store.setState({ query, selectedIndex: -1 })
    this.syncSearch()
    window.core?.shell?.refreshShellActions()
  }

  setSelectedIndex(index: number | ((prev: number) => number)): void {
    const prev = this.state.selectedIndex
    const next = typeof index === 'function' ? index(prev) : index
    this.store.setState({ selectedIndex: next })
    window.core?.shell?.refreshShellActions()
  }

  setRegexMode(value: boolean | ((prev: boolean) => boolean)): void {
    const prev = this.state.regexMode
    const next = typeof value === 'function' ? value(prev) : value
    this.store.setState({ regexMode: next, selectedIndex: -1 })
    this.syncSearch()
    window.core?.shell?.refreshShellActions()
  }

  handleOpen(item: AngrysearchItem): void {
    this.invoke('openFile', item.value).catch(() => {})
    window.core?.window?.hide?.()
  }

  handleOpenLocation(item: AngrysearchItem): void {
    this.invoke('openLocation', item.value).catch(() => {})
    window.core?.window?.hide?.()
  }

  triggerUpdate(): void {
    this.invoke('updateDatabase')
      .then(() => {
        const status = this.state.status
        this.store.setState({ status: status ? { ...status, isUpdating: true } : status })
        this.startStatusPoll()
      })
      .catch(() => {})
  }

  private startStatusPoll(): void {
    if (this.statusPollTimer) return
    this.statusPollTimer = setInterval(() => {
      this.invoke('getStatus')
        .then((status) => {
          this.store.setState({ status })
          if (!status.isUpdating) this.stopStatusPoll()
        })
        .catch(() => {})
    }, STATUS_POLL_MS)
  }

  private stopStatusPoll(): void {
    if (this.statusPollTimer) {
      clearInterval(this.statusPollTimer)
      this.statusPollTimer = null
    }
  }

  private syncSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer)
    const { query, regexMode } = this.state

    if (query.trim().length < MIN_QUERY_LENGTH) {
      this.store.setState({ items: [] })
      return
    }

    const generation = ++this.searchGen
    this.searchTimer = setTimeout(() => {
      if (generation !== this.searchGen) return
      this.invoke('search', { query, regex: regexMode })
        .then((result) => {
          if (generation !== this.searchGen) return
          this.store.setState({
            items: result.items,
            selectedIndex: result.items.length > 0 ? 0 : -1,
          })
        })
        .catch(() => {
          if (generation !== this.searchGen) return
          this.store.setState({ items: [] })
        })
    }, SEARCH_DEBOUNCE_MS)
  }

  getKeyActions(): ShellAction[] {
    return this.buildActions()
  }

  /**
   * Single source of truth for both the footer (actions with a `hint`) and
   * the Ctrl+K palette (actions with `showInMenu: true`).
   */
  private buildActions(): ShellAction[] {
    const { items } = this.state
    const t = this.t.t

    return [
      {
        id: 'angrysearch-navigate-up',
        key: 'ArrowUp',
        label: t('actions.navigate'),
        hint: '↑↓',
        allowRepeat: true,
        handler: () => {
          if (items.length === 0) return
          this.setSelectedIndex((prev) => Math.max(0, prev - 1))
        },
      },
      {
        id: 'angrysearch-navigate-down',
        key: 'ArrowDown',
        label: '',
        allowRepeat: true,
        handler: () => {
          if (items.length === 0) return
          this.setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1))
        },
      },
      {
        id: 'angrysearch-open',
        key: 'Enter',
        label: t('actions.openFile'),
        hint: '↵',
        activeOn: () => this.state.selectedIndex >= 0,
        handler: () => {
          const item = this.state.items[this.state.selectedIndex]
          if (item) this.handleOpen(item)
        },
      },
      {
        id: 'angrysearch-open-location',
        key: 'Enter',
        modifiers: ['shift'],
        label: t('actions.openFolder'),
        hint: ['⇧', '↵'],
        activeOn: () => this.state.selectedIndex >= 0,
        handler: () => {
          const item = this.state.items[this.state.selectedIndex]
          if (item) this.handleOpenLocation(item)
        },
      },
      {
        id: 'angrysearch-toggle-regex',
        key: 'r',
        modifiers: ['ctrl'],
        label: t('actions.toggleRegex'),
        section: 'actions',
        showInMenu: true,
        handler: () => this.setRegexMode((prev) => !prev),
      },
      {
        id: 'angrysearch-update-database',
        key: 'u',
        modifiers: ['ctrl'],
        label: t('actions.updateDatabase'),
        section: 'actions',
        showInMenu: true,
        handler: () => this.triggerUpdate(),
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
