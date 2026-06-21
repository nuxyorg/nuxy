import type { ShellAction } from '@nuxyorg/core'
import { setToolSearchPlaceholder, BaseExtensionController } from '@nuxyorg/extension-sdk'
import type { TypedInvoker } from '@nuxyorg/extension-sdk'
import { TABS, buildNavSections, filterExtensions } from './utils/store-filter.ts'
import type { NavSection } from './utils/store-filter.ts'
import type { ExtensionListItem, IpcChannels } from './types.ts'

const EXT_ID = 'com.nuxy.store'

export interface StoreState {
  extensions: ExtensionListItem[]
  loading: boolean
  error: string | null
  activeTab: string
  query: string
  selectedIndex: number
  focusArea: 'left' | 'right'
}

export class StoreController extends BaseExtensionController<StoreState> {
  constructor(onUpdate: () => void) {
    super(
      EXT_ID,
      {
        extensions: [],
        loading: false,
        error: null,
        activeTab: 'all',
        query: '',
        selectedIndex: -1,
        focusArea: 'right',
      },
      onUpdate
    )
  }

  private invoke: TypedInvoker<IpcChannels> = async (channel, ...args) => {
    const res = await window.core.ipc.invoke(EXT_ID, channel, args[0])
    const r = res as { success: boolean; data?: unknown; error?: string } | null
    if (!r?.success) throw new Error(r?.error ?? 'IPC failed')
    return r.data as never
  }

  connect(): void {
    if (!window.core?.ipc) return
    this.syncSearchPlaceholder()
    this.bindKeyboard()
    void this.loadCatalog()
  }

  disconnect(): void {
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
    window.core?.shell?.refreshShellActions()
  }

  setSelectedIndex(index: number | ((prev: number) => number)): void {
    const prev = this.state.selectedIndex
    const next = typeof index === 'function' ? index(prev) : index
    this.store.setState({ selectedIndex: next })
    window.core?.shell?.refreshShellActions()
  }

  setActiveTab(tabId: string): void {
    if (this.state.activeTab === tabId) return
    this.store.setState({ activeTab: tabId, selectedIndex: -1 })
    window.core?.shell?.refreshShellActions()
  }

  setFocusArea(area: 'left' | 'right'): void {
    this.store.setState({ focusArea: area })
  }

  get filteredExtensions(): ExtensionListItem[] {
    return filterExtensions(this.state.extensions, this.state.activeTab, this.state.query)
  }

  get navSections(): NavSection[] {
    return buildNavSections(this.state.extensions).map((s) => ({
      ...s,
      label: this.t.t(`tabs.${s.id}`) || s.label,
    }))
  }

  get selectedExtension(): ExtensionListItem | null {
    const { selectedIndex } = this.state
    const filtered = this.filteredExtensions
    return selectedIndex >= 0 && selectedIndex < filtered.length ? filtered[selectedIndex] : null
  }

  async loadCatalog(): Promise<void> {
    this.store.setState({ loading: true, error: null })
    try {
      const data = await this.invoke('getExtensions')
      this.store.setState({ extensions: data, loading: false })
    } catch (e) {
      this.store.setState({
        error: e instanceof Error ? e.message : this.t.t('error.networkError'),
        loading: false,
      })
    }
  }

  async handleInstall(ext: ExtensionListItem): Promise<void> {
    if (this.state.loading) return
    this.store.setState({ loading: true })
    window.UI?.toast?.(this.t.t('loading.installing', { name: ext.name }), { type: 'info' })
    try {
      const result = await this.invoke('installExtension', {
        extId: ext.id,
        downloadUrl: ext.downloadUrl,
      })
      if (result.success) {
        window.UI?.toast?.(this.t.t('toast.installSuccess', { name: ext.name }), {
          type: 'success',
        })
        await this.loadCatalog()
      } else {
        const msg = result.error || this.t.t('error.installFailed', { name: ext.name })
        this.store.setState({ error: msg, loading: false })
        window.UI?.toast?.(msg, { type: 'error' })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : this.t.t('error.installError')
      this.store.setState({ error: msg, loading: false })
      window.UI?.toast?.(msg, { type: 'error' })
    }
  }

  async handleUninstall(ext: ExtensionListItem): Promise<void> {
    if (this.state.loading || ext.isSystem) return
    this.store.setState({ loading: true })
    window.UI?.toast?.(this.t.t('loading.uninstalling', { name: ext.name }), { type: 'info' })
    try {
      const result = await this.invoke('uninstallExtension', { extId: ext.id })
      if (result.success) {
        window.UI?.toast?.(this.t.t('toast.uninstallSuccess', { name: ext.name }), {
          type: 'success',
        })
        await this.loadCatalog()
      } else {
        const msg = result.error || this.t.t('error.uninstallFailed', { name: ext.name })
        this.store.setState({ error: msg, loading: false })
        window.UI?.toast?.(msg, { type: 'error' })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : this.t.t('error.uninstallError')
      this.store.setState({ error: msg, loading: false })
      window.UI?.toast?.(msg, { type: 'error' })
    }
  }

  getKeyActions(): ShellAction[] {
    return this.buildActions()
  }

  private buildActions(): ShellAction[] {
    const t = this.t.t
    const filtered = this.filteredExtensions

    return [
      {
        id: 'store-navigate-up',
        key: 'ArrowUp',
        label: t('actions.navigate'),
        hint: '↑↓',
        handler: () => {
          this.setSelectedIndex((idx) => (idx <= 0 ? 0 : idx - 1))
        },
      },
      {
        id: 'store-navigate-down',
        key: 'ArrowDown',
        label: '',
        handler: () => {
          this.setSelectedIndex((idx) => {
            const maxIdx = this.filteredExtensions.length - 1
            return idx >= maxIdx ? maxIdx : idx + 1
          })
        },
      },
      {
        id: 'store-install',
        key: 'i',
        label: t('actions.installUpdate'),
        hint: 'I',
        activeOn: () => {
          const item = filtered[this.state.selectedIndex]
          return !!(item && (!item.installed || item.canUpdate))
        },
        handler: () => {
          const item = this.filteredExtensions[this.state.selectedIndex]
          if (item) void this.handleInstall(item)
        },
      },
      {
        id: 'store-uninstall',
        key: 'u',
        label: t('actions.uninstall'),
        hint: 'U',
        activeOn: () => {
          const item = filtered[this.state.selectedIndex]
          return !!(item && item.installed && !item.isSystem)
        },
        handler: () => {
          const item = this.filteredExtensions[this.state.selectedIndex]
          if (item) void this.handleUninstall(item)
        },
      },
      {
        id: 'store-refresh',
        key: 'r',
        label: t('actions.refresh'),
        hint: 'R',
        handler: () => {
          void this.loadCatalog()
        },
      },
      {
        id: 'store-enter',
        key: 'Enter',
        label: t('actions.performAction'),
        hint: '↵',
        activeOn: () => {
          const { selectedIndex } = this.state
          return selectedIndex >= 0 && selectedIndex < filtered.length
        },
        handler: () => {
          const item = this.filteredExtensions[this.state.selectedIndex]
          if (!item) return
          if (!item.installed || item.canUpdate) {
            void this.handleInstall(item)
          } else if (item.installed && !item.isSystem) {
            void this.handleUninstall(item)
          }
        },
      },
      {
        id: 'store-next-category',
        key: 'Tab',
        label: t('actions.nextCategory'),
        hint: 'Tab',
        handler: () => {
          const idx = TABS.findIndex((tab) => tab.id === this.state.activeTab)
          const nextTab = TABS[(idx + 1) % TABS.length].id
          this.setActiveTab(nextTab)
        },
      },
      {
        id: 'store-focus-sidebar',
        key: 'ArrowLeft',
        label: t('actions.focusSidebar'),
        handler: () => {
          this.setFocusArea('left')
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
