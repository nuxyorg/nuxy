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
    const res = await window.core.ipc.invoke(EXT_ID, channel, args[0], { callerExtId: EXT_ID })
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

  /** Mouse click on a category — switches tab and focuses the extension list. */
  setActiveTab(tabId: string): void {
    if (this.state.activeTab === tabId && this.state.focusArea === 'right') return
    this.store.setState({ activeTab: tabId, selectedIndex: -1, focusArea: 'right' })
    window.core?.shell?.refreshShellActions()
  }

  /** Keyboard navigation on the left category list — stays on the left panel. */
  navigateTab(tabId: string): void {
    if (this.state.activeTab === tabId) return
    this.store.setState({ activeTab: tabId, selectedIndex: -1 })
    window.core?.shell?.refreshShellActions()
  }

  focusLeftPanel(): void {
    this.store.setState({ focusArea: 'left', selectedIndex: -1 })
    window.core?.shell?.refreshShellActions()
  }

  focusRightPanel(): void {
    const filtered = this.filteredExtensions
    this.store.setState({
      focusArea: 'right',
      selectedIndex: filtered.length > 0 ? 0 : -1,
    })
    window.core?.shell?.refreshShellActions()
  }

  selectExtension(index: number): void {
    this.store.setState({ selectedIndex: index, focusArea: 'right' })
    window.core?.shell?.refreshShellActions()
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
    return this.state.focusArea === 'left'
      ? this.buildLeftPanelActions()
      : this.buildRightPanelActions()
  }

  private buildLeftPanelActions(): ShellAction[] {
    const t = this.t.t
    const currentIdx = TABS.findIndex((tab) => tab.id === this.state.activeTab)

    return [
      {
        id: 'store-tab-up',
        key: 'ArrowUp',
        label: t('actions.navigate'),
        hint: '↑↓',
        allowRepeat: true,
        handler: () => {
          if (currentIdx > 0) this.navigateTab(TABS[currentIdx - 1].id)
        },
      },
      {
        id: 'store-tab-down',
        key: 'ArrowDown',
        label: '',
        allowRepeat: true,
        handler: () => {
          if (currentIdx < TABS.length - 1) this.navigateTab(TABS[currentIdx + 1].id)
        },
      },
      {
        id: 'store-focus-right',
        key: 'ArrowRight',
        label: '',
        handler: () => this.focusRightPanel(),
      },
      {
        id: 'store-open-category',
        key: 'Enter',
        label: t('actions.performAction'),
        hint: '↵',
        handler: () => this.focusRightPanel(),
      },
    ]
  }

  private buildRightPanelActions(): ShellAction[] {
    const t = this.t.t
    const filtered = this.filteredExtensions
    const selected = filtered[this.state.selectedIndex]

    return [
      {
        id: 'store-focus-sidebar',
        key: 'ArrowLeft',
        label: t('actions.focusSidebar'),
        handler: () => this.focusLeftPanel(),
      },
      {
        id: 'store-navigate-up',
        key: 'ArrowUp',
        label: t('actions.navigate'),
        hint: '↑↓',
        allowRepeat: true,
        handler: () =>
          this.setSelectedIndex((idx) => {
            if (idx <= 0) {
              this.focusLeftPanel()
              return -1
            }
            return idx - 1
          }),
      },
      {
        id: 'store-navigate-down',
        key: 'ArrowDown',
        label: '',
        allowRepeat: true,
        handler: () => {
          this.setSelectedIndex((idx) => {
            const maxIdx = filtered.length - 1
            return idx >= maxIdx ? maxIdx : idx + 1
          })
        },
      },
      {
        id: 'store-install',
        key: 'Enter',
        label: t('actions.installUpdate'),
        hint: '↵',
        section: 'actions',
        showInMenu: !!(selected && (!selected.installed || selected.canUpdate)),
        activeOn: () => {
          const item = filtered[this.state.selectedIndex]
          return !!(item && (!item.installed || item.canUpdate))
        },
        handler: () => {
          const item = filtered[this.state.selectedIndex]
          if (item) void this.handleInstall(item)
        },
      },
      {
        id: 'store-uninstall',
        key: 'Delete',
        label: t('actions.uninstall'),
        hint: 'Del',
        section: 'actions',
        showInMenu: !!(selected && selected.installed && !selected.isSystem),
        activeOn: () => {
          const item = filtered[this.state.selectedIndex]
          return !!(item && item.installed && !item.isSystem)
        },
        handler: () => {
          const item = filtered[this.state.selectedIndex]
          if (item) void this.handleUninstall(item)
        },
      },
      {
        id: 'store-refresh',
        key: 'r',
        modifiers: ['ctrl'],
        label: t('actions.refresh'),
        section: 'actions',
        showInMenu: true,
        handler: () => {
          void this.loadCatalog()
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
