import type { ShellBridgeSnapshot, ReactiveControllerHost } from '@nuxyorg/core'
import { createStore, type Store, createTranslator, type Translator } from '@nuxyorg/extension-sdk'
import { getZoom } from './utils/zoom.ts'
import { resolveLayoutHeight, resolveLayoutWidth } from './utils.ts'
import { SHELL_EXT_ID } from './utils.ts'
import { resolveHoldMs } from './hold-ms.ts'
import { CommandPaletteController } from './controllers/command-palette-controller.ts'
import { ToolController } from './controllers/tool-controller.ts'
import { ProviderController } from './controllers/provider-controller.ts'
import { WindowController } from './controllers/window-controller.ts'
import { KeyboardController } from './controllers/keyboard-controller.ts'
import { FocusController } from './controllers/focus-controller.ts'
import { queryOmniBarInputFromDom } from './utils/focus.ts'
import { InitController } from './controllers/init-controller.ts'
import { SyncController } from './controllers/sync-controller.ts'
import { DeeplinkController } from './controllers/deeplink-controller.ts'
import { QueryController } from './controllers/query-controller.ts'
import { NavigationController } from './controllers/navigation-controller.ts'
import { SettingsController } from './controllers/settings-controller.ts'
import { syncToolSearchPlaceholder } from './utils/tool-search-placeholder.ts'
import {
  buildAutoSettingsAction,
  buildCallerCommandActions,
  mergeCommandPaletteActions,
} from './utils/caller-commands.ts'
import { syncBlurSuppression } from '@nuxyorg/extension-sdk'
import type {
  HoldProgress,
  ListItem,
  Orchestrator,
  Provider,
  ProviderState,
  ShellConfig,
  Tool,
  UsageStats,
} from './types.ts'
import type { OmnibarSection } from './utils/list-results.ts'
import { resolveOmniBarPlaceholder as computeOmniBarPlaceholder } from './utils/omni-bar-placeholder.ts'

export type { OmnibarSection }

const EMPTY_SNAPSHOT: ShellBridgeSnapshot = {
  toolActions: [],
  keyActionHints: [],
  omniBarPortal: null,
  footerPortal: null,
  searchPlaceholder: null,
}

const DEFAULT_SETTINGS: ShellConfig = {
  windowWidth: 800,
  windowMaxHeight: 600,
  opacity: 1,
  theme: 'dark',
  zoom: '100%',
  font: 'system',
  windowPosition: '1/2, 1/2',
  holdMs: 'long',
}

export interface ExtensionSummary {
  tools: number
  themes: number
  uikit: number
  iconpacks: number
}

export interface ShellCoreState {
  query: string
  savedQuery: string
  /**
   * Path forwarded from a `nuxy://` deeplink (e.g. "extension/com.nuxy.nyaa"),
   * kept separate from query/savedQuery so a deeplink never shows up as text
   * in the visible search box or gets treated as a search filter by the
   * target tool. Consumed by the tool host as `committedQuery` instead of
   * savedQuery when set. Cleared whenever a tool is opened by any other means.
   */
  deeplinkPath: string | null
  selectedIndex: number
  showOmniBar: boolean
  isInitialLoad: boolean
  copiedId: string | null
  themeStyles: Record<string, string> | null
  settings: ShellConfig
  bridge: ShellBridgeSnapshot
  holdProgress: HoldProgress | null
  extensionSummary: ExtensionSummary | null
}

// Keep the old alias for any code that still reads ctrl.state
export type ShellControllerState = ShellCoreState & {
  activeTool: string | null
  showCommandPalette: boolean
  position: { x: number; y: number }
  size: { width: number | null; height: number | null }
  isDraggingState: boolean
  tools: Tool[]
  providers: Provider[]
  orchestrators: Orchestrator[]
  recentToolIds: string[]
  providerStates: Record<string, ProviderState>
  omnibarSections: OmnibarSection[]
  listResults: ListItem[]
  navigableResults: ListItem[]
  providerCardItems: ListItem[]
  isAnyListProviderLoading: boolean
}

export interface ShellControllerRefs {
  container: HTMLElement | null
  input: HTMLInputElement | null
  commandPaletteInput: HTMLInputElement | null
  cfg: ShellConfig | null
  hasDragged: boolean
  selectionSource: 'type' | 'nav'
}

export class ShellController {
  readonly store: Store<ShellCoreState>
  readonly refs: ShellControllerRefs
  readonly t: Translator

  // Sub-controllers — public so shell-view can read them directly
  readonly commandPalette: CommandPaletteController
  readonly tools: ToolController
  readonly providers: ProviderController
  readonly win: WindowController
  readonly query: QueryController
  readonly navigation: NavigationController
  readonly settings: SettingsController

  private readonly _host: ReactiveControllerHost
  private readonly _keyboard: KeyboardController
  private readonly _focus: FocusController
  private readonly _init: InitController
  private readonly _sync: SyncController
  private readonly _deeplink: DeeplinkController
  private cleanups: Array<() => void> = []
  private copiedTimer: ReturnType<typeof setTimeout> | null = null
  private initialLoadTimer: ReturnType<typeof setTimeout> | null = null
  private _queryDebounceTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private onUpdate: () => void) {
    this._host = {
      addController: () => {},
      removeController: () => {},
      requestUpdate: () => this.onUpdate(),
      updateComplete: Promise.resolve(true),
    }

    this.commandPalette = new CommandPaletteController(this._host)
    this.win = new WindowController(this._host)
    this.query = new QueryController(this._host)
    this.navigation = new NavigationController(this._host)
    this.settings = new SettingsController(this._host)
    this.tools = new ToolController(this._host, {
      onToolChange: (toolId) => {
        const manifest = toolId ? this.tools.tools.find((t) => t.id === toolId)?.manifest : null
        syncBlurSuppression(toolId, manifest)
        window.core?.shell?.resetToolState({ clearSearchPlaceholder: toolId === null })
        if (toolId) {
          syncToolSearchPlaceholder(toolId, () => this.tools.activeTool === toolId)
        }
        this.providers.sync(
          this.store.getState().savedQuery,
          toolId,
          this.tools.tools,
          this.tools.recentToolIds,
          this.tools.usageStats
        )
      },
    })
    this.providers = new ProviderController(this._host)

    this.store = createStore<ShellCoreState>({
      query: '',
      savedQuery: '',
      deeplinkPath: null,
      selectedIndex: -1,
      showOmniBar: true,
      isInitialLoad: true,
      copiedId: null,
      themeStyles: null,
      settings: DEFAULT_SETTINGS,
      bridge: EMPTY_SNAPSHOT,
      holdProgress: null,
      extensionSummary: null,
    })
    ;(this._host as any).store = this.store

    this.refs = {
      container: null,
      input: null,
      commandPaletteInput: null,
      cfg: null,
      hasDragged: false,
      selectionSource: 'type',
    }

    this.t = createTranslator(SHELL_EXT_ID, () => this.onUpdate())
    this.store.subscribe(() => this.onUpdate())

    // Wire up focused sub-controllers
    this._keyboard = new KeyboardController({
      isCommandPaletteOpen: () => this.commandPalette.showCommandPalette,
      isToolActive: () => this.tools.activeTool !== null,
      toggleCommandPalette: () => this.toggleCommandPalette(),
      closeCommandPalette: () => this.closeCommandPalette(),
      returnToShell: () => this.returnToShell({ selectedIndex: 0 }),
      clearQueryAndEsc: () => {
        this.query.reset()
        this.navigation.reset()
        this.providers.clearProviderStates()
        this._syncProviders()
        this._recompute()
        window.core?.window?.esc?.()
      },
      setHoldProgress: (progress) => this.store.setState({ holdProgress: progress }),
      getHoldMs: () => resolveHoldMs(this.store.getState().settings.holdMs),
      hasCommandPaletteActions: () => this.commandPaletteActions().length > 0,
      hasActiveToolSettings: () => this._activeToolSettingsDeeplink() !== null,
      openActiveToolSettings: () => {
        const deeplink = this._activeToolSettingsDeeplink()
        if (deeplink) void window.core?.deeplink?.dispatch?.(deeplink)
      },
    })

    this._focus = new FocusController({
      isCommandPaletteOpen: () => this.commandPalette.showCommandPalette,
      getOmniBarInput: () => this.refs.input,
      getCommandPaletteInput: () => this.refs.commandPaletteInput,
      isOmniBarEnabled: () => this.store.getState().showOmniBar,
    })

    this._init = new InitController({
      getActiveTool: () => this.tools.activeTool,
      applySettings: (s) => this._applySettings(s),
      setTools: (tools) => this.tools.setTools(tools),
      setProviders: (providers) => this.providers.setProviders(providers),
      setOrchestrators: (orchestrators) => this.tools.setOrchestrators(orchestrators),
      setRecentToolIds: (ids) => this.tools.setRecentToolIds(ids),
      setUsageStats: (stats) => this.tools.setUsageStats(stats),
      setThemeStyles: (styles) => this.store.setState({ themeStyles: styles }),
      setExtensionSummary: (summary) => this.store.setState({ extensionSummary: summary }),
      setCfg: (cfg) => {
        this.refs.cfg = { ...(this.refs.cfg ?? {}), ...cfg }
      },
      recompute: () => this._recompute(),
      syncProviders: () => this._syncProviders(),
    })

    this._sync = new SyncController({
      getContainer: () => this.refs.container,
      getInput: () => this.refs.input,
      getCommandPaletteInput: () => this.refs.commandPaletteInput,
      getCfg: () => this.refs.cfg,
      getSettings: () => this.store.getState().settings,
      getSize: () => this.win.size,
      getActiveTool: () => this.tools.activeTool,
      getSpringHeight: () => this.win.springHeight,
      setCfg: (cfg) => {
        this.refs.cfg = { ...(this.refs.cfg ?? {}), ...cfg }
      },
      hasDragged: () => this.refs.hasDragged,
      setHasDragged: (val) => {
        this.refs.hasDragged = val
      },
      setDragging: (val) => this.win.setDragging(val),
      animatePosition: (pos) => this.win.animatePosition(pos),
      setBridge: (snapshot) => this.store.setState({ bridge: snapshot }),
      getEmptyBridge: () => EMPTY_SNAPSHOT,
      resetTool: () => {
        this.tools.setActiveTool(null)
        this.query.reset()
        this.navigation.reset()
        this.store.setState({
          showOmniBar: true,
        })
      },
      closeCommandPalette: () => this.commandPalette.close(),
      clearProviderStates: () => this.providers.clearProviderStates(),
      syncProviders: () => this._syncProviders(),
      recompute: () => this._recompute(),
      returnToShell: () => this.returnToShell(),
      applySettings: (s) => this._applySettings(s),
      ensureShellFocus: () => this.ensureShellFocus(),
    })

    this._deeplink = new DeeplinkController({
      openTool: (toolId, path) => this.openToolFromDeeplink(toolId, path),
      getTools: () => this.tools.tools,
    })
  }

  ensureShellFocus(): void {
    const resolved = queryOmniBarInputFromDom()
    if (resolved) this.refs.input = resolved
    this._focus.ensureShellFocus()
  }

  bindOmniBarInput(input: HTMLInputElement | null): void {
    this._focus.bindOmniInput(input)
  }

  // Merged state view for backward-compat with shell-view
  get state(): ShellControllerState {
    const core = this.store.getState()
    return {
      ...core,
      query: this.query.query,
      savedQuery: this.query.savedQuery,
      selectedIndex: this.navigation.selectedIndex,
      activeTool: this.tools.activeTool,
      showCommandPalette: this.commandPalette.showCommandPalette,
      position: this.win.position,
      size: this.win.size,
      isDraggingState: this.win.isDraggingState,
      tools: this.tools.tools,
      providers: this.providers.providers,
      orchestrators: this.tools.orchestrators,
      recentToolIds: this.tools.recentToolIds,
      providerStates: this.providers.providerStates,
      omnibarSections: this.providers.omnibarSections,
      listResults: this.providers.listResults,
      navigableResults: this.providers.navigableResults,
      providerCardItems: this.providers.providerCardItems,
      isAnyListProviderLoading: this.providers.isAnyListProviderLoading,
    }
  }

  connect(): void {
    this._init.load()
    this._sync.bindBridge()
    this._sync.bindSync()
    this._keyboard.bind()
    this._focus.bind()
    this._deeplink.bind()
    this._bindQuerySelectionSync()
    this._bindOmniBarControl()
    this._bindPositionClamp()
    this.providers.recompute(this.tools.tools, '', this.tools.recentToolIds, this.tools.usageStats)
    this.initialLoadTimer = setTimeout(() => {
      this.store.setState({ isInitialLoad: false })
    }, 500)
  }

  disconnect(): void {
    if (this.copiedTimer) clearTimeout(this.copiedTimer)
    if (this.initialLoadTimer) clearTimeout(this.initialLoadTimer)
    if (this._queryDebounceTimer !== null) clearTimeout(this._queryDebounceTimer)
    this.cleanups.forEach((fn) => fn())
    this.cleanups = []
    this._keyboard.destroy()
    this._focus.destroy()
    this._init.destroy()
    this._sync.destroy()
    this._deeplink.destroy()
    this.t.destroy()
    window.core?.shell?.resetToolState()
  }

  get activeToolName(): string | null {
    return this.tools.activeToolName
  }

  get activeToolPlaceholder(): string | null {
    return this.tools.activeToolPlaceholder
  }

  get activeToolOmniBarPosition(): 'top' | 'bottom' {
    return this.tools.activeToolOmniBarPosition
  }

  resolveOmniBarPlaceholder(): string {
    return computeOmniBarPlaceholder(
      this.store.getState().bridge,
      this.activeToolName,
      this.activeToolPlaceholder,
      this.t.t
    )
  }

  /**
   * Ctrl+K palette entries: the active tool's `bridge.toolActions` merged
   * with that tool's manifest `caller.commands` (see
   * `extensions/shell/utils/caller-commands.ts`). Caller commands are scoped
   * to the owning extension — only visible while that tool is active.
   */
  commandPaletteActions(): import('@nuxyorg/core').ShellAction[] {
    const callerActions = buildCallerCommandActions(this.tools.tools, this.tools.activeTool)
    const autoSettingsAction = buildAutoSettingsAction(
      this.tools.tools,
      this.tools.activeTool,
      this.t.t
    )
    return mergeCommandPaletteActions(this.store.getState().bridge.toolActions, [
      ...callerActions,
      ...autoSettingsAction,
    ])
  }

  /** Settings deeplink for the active tool, or null when it declares no settings. */
  private _activeToolSettingsDeeplink(): string | null {
    const activeToolId = this.tools.activeTool
    if (!activeToolId) return null
    const tool = this.tools.tools.find((t) => t.id === activeToolId)
    if (!tool?.manifest.entry?.settings) return null
    return `nuxy://settings/extension/${activeToolId}`
  }

  setQuery(val: string): void {
    this.query.setQuery(val)
  }

  setSavedQuery(val: string): void {
    this.query.setSavedQuery(val)
    this._syncProviders()
    this._recompute()
  }

  setSelectedIndex(index: number | ((prev: number) => number)): void {
    this.navigation.setSelectedIndex(index)
  }

  setActiveTool(toolId: string | null): void {
    this.tools.setActiveTool(toolId)
    this._syncProviders()
    this._recompute()
  }

  handleQueryChange(val: string): void {
    this.refs.selectionSource = 'type'
    this.query.handleChange(val)
    this.navigation.reset()
    this._recompute()
    this._syncActionProviders()
    if (this._queryDebounceTimer !== null) clearTimeout(this._queryDebounceTimer)
    this._queryDebounceTimer = setTimeout(() => {
      this._queryDebounceTimer = null
      this._syncListProviders()
    }, 200)
  }

  handleCopy(id: string): void {
    this.store.setState({ copiedId: id })
    if (this.copiedTimer) clearTimeout(this.copiedTimer)
    this.copiedTimer = setTimeout(() => this.store.setState({ copiedId: null }), 1200)
  }

  openTool(toolId: string, initialQuery = ''): void {
    const queryBeforeOpen = this.store.getState().savedQuery
    const container = this.refs.container
    if (container && !this.refs.hasDragged) {
      const fromH = container.offsetHeight
      // Only record resting height when not mid-animation (e.g. switching tools)
      if (!this.win.isAnimatingHeight) this.win.recordRestingHeight(fromH)
      const targetH = this.store.getState().settings.windowMaxHeight ?? 600
      this.win.animateToHeight(targetH, fromH)
      this._sync.updatePosition(true, targetH)
    }
    this.store.setState({ deeplinkPath: null })
    this.tools.setActiveTool(toolId)
    this.query.handleChange(initialQuery)
    this.navigation.reset()
    this.providers.clearProviderStates()
    this._recordToolUsed(toolId, queryBeforeOpen)
    this._syncProviders()
    this._recompute()
  }

  /**
   * Opens a tool from a `nuxy://` deeplink. Unlike `openTool`, the path is
   * forwarded as `deeplinkPath` (consumed by the tool host as
   * `committedQuery`) rather than as the live search query — a deeplink path
   * like "extension/com.nuxy.nyaa" is not a search string and must not show
   * up in the visible search box or be applied as a filter by the tool.
   */
  openToolFromDeeplink(toolId: string, path: string): void {
    this.openTool(toolId, '')
    this.store.setState({ deeplinkPath: path })
  }

  async handleItemClick(item: ListItem): Promise<void> {
    if (item.execute) {
      try {
        const res = await window.core.ipc.invoke(
          item.id,
          item.execute.channel,
          item.execute.payload
        )
        const r = res as { success: boolean; data?: { toolId?: string; query?: string } } | null
        if (r?.success && r.data?.toolId) {
          this.openTool(r.data.toolId, r.data.query || '')
        }
      } catch (e) {
        console.error('Failed to execute item action:', e)
      }
    } else if (item.isTool) {
      this.openTool(item.id, (item as ListItem & { initialQuery?: string }).initialQuery || '')
    } else if (item.value != null && String(item.value) !== '') {
      navigator.clipboard.writeText(String(item.value)).catch(() => {})
      this.handleCopy(item.id)
    }
  }

  async tryOrchestratorRoute(): Promise<void> {
    const { savedQuery } = this.store.getState()
    const { orchestrators } = this.tools
    if (!savedQuery.trim() || orchestrators.length === 0) return
    try {
      const res = await window.core.ipc.invoke(orchestrators[0].id, 'route', { text: savedQuery })
      const r = res as {
        success?: boolean
        data?: { ok?: boolean; data?: { toolCalled?: string; initialQuery?: string } }
      } | null
      const route = r?.success ? r.data : null
      if (route?.ok && route.data?.toolCalled) {
        this.openTool(route.data.toolCalled, route.data.initialQuery ?? '')
      }
    } catch {
      /* ignore */
    }
  }

  handleOmniKeyDown(e: KeyboardEvent): void {
    const { savedQuery, selectedIndex } = this.store.getState()
    const { activeTool } = this.tools
    const navigableResults = this.providers.navigableResults

    if (activeTool && this.store.getState().query === '' && e.key === 'Backspace') {
      e.preventDefault()
      this.returnToShell({ selectedIndex: 0 })
      return
    }

    if (activeTool) return

    if (navigableResults.length === 0) {
      if (e.key === 'Enter' && savedQuery.trim()) {
        void this.tryOrchestratorRoute()
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.refs.selectionSource = 'nav'
      this.setSelectedIndex((prev) => {
        const next = prev + 1
        return next < navigableResults.length ? next : prev
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.refs.selectionSource = 'nav'
      this.setSelectedIndex((prev) => {
        const next = prev - 1
        return next >= -1 ? next : prev
      })
    } else if (e.key === 'ArrowRight') {
      if (selectedIndex >= 0 && navigableResults[selectedIndex]) {
        e.preventDefault()
        const title = navigableResults[selectedIndex].title
        this.store.setState({ savedQuery: title, query: title, selectedIndex: -1 })
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const index = selectedIndex >= 0 && navigableResults[selectedIndex] ? selectedIndex : 0
      void this.handleItemClick(navigableResults[index])
    }
  }

  handleDragMouseDown(e: MouseEvent): void {
    this.refs.hasDragged = true
    this.win.handleDragMouseDown(e, this.refs.container)
  }

  handleResizeMouseDown(e: MouseEvent, direction: string): void {
    this.refs.hasDragged = true
    this.win.handleResizeMouseDown(e, direction, this.refs.container)
  }

  closeCommandPalette(): void {
    this.commandPalette.close()
    this.ensureShellFocus()
  }

  toggleCommandPalette(): void {
    if (this.commandPalette.showCommandPalette) {
      this.closeCommandPalette()
      return
    }
    this.commandPalette.open()
  }

  /** Deactivate the active tool and reset omnibar query to return to the main shell screen. */
  returnToShell(options?: { selectedIndex?: number }): void {
    const container = this.refs.container
    const fromH = container?.offsetHeight ?? 0

    this.tools.setActiveTool(null)
    this.query.reset()
    this.navigation.setSelectedIndex(options?.selectedIndex ?? -1)
    this.store.setState({
      showOmniBar: true,
    })
    this._syncProviders()
    this._recompute()

    const finishReturn = (): void => {
      requestAnimationFrame(() => {
        this._sync.updatePosition(true)
        this.ensureShellFocus()
      })
    }

    if (container && fromH > 0 && !this.refs.hasDragged) {
      requestAnimationFrame(() => {
        const toH = container.offsetHeight
        if (toH <= 0) {
          finishReturn()
          return
        }
        this.win.recordRestingHeight(toH)
        this._sync.updatePosition(true, toH)
        if (Math.abs(fromH - toH) >= 1) {
          this.win.animateToHeight(null, fromH, finishReturn)
        } else {
          finishReturn()
        }
      })
    } else {
      finishReturn()
    }
  }

  containerStyle(): Record<string, string | undefined> {
    const { settings, isInitialLoad } = this.store.getState()
    return this.win.containerStyle(settings, this.tools.activeTool, isInitialLoad)
  }

  onContainerReady(): void {
    const settings = this.store.getState().settings
    this.refs.cfg = { ...(this.refs.cfg ?? {}), ...settings }
    requestAnimationFrame(() => this._sync.updatePosition(true))
  }

  private _applySettings(s: ShellConfig): void {
    const prev = this.store.getState().settings
    const widthChanged = s.windowWidth !== prev.windowWidth
    const maxHeightChanged = s.windowMaxHeight !== prev.windowMaxHeight
    this.store.setState({ settings: s })
    this.refs.cfg = { ...(this.refs.cfg ?? {}), ...s }
    this.settings.applySettings(s)
    if (widthChanged || maxHeightChanged) {
      this.win.setSize({
        width: widthChanged ? null : this.win.size.width,
        height: maxHeightChanged ? null : this.win.size.height,
      })
    }
    requestAnimationFrame(() => this._sync.updatePosition(true))
  }

  private _recordToolUsed(toolId: string, query = ''): void {
    window.core?.ipc
      ?.invoke(SHELL_EXT_ID, 'recordToolUsed', { toolId, query })
      .then((res: unknown) => {
        const r = res as { success: boolean; data: string[] } | null
        if (r?.success && Array.isArray(r.data)) {
          this.tools.setRecentToolIds(r.data)
          this._recompute()
        }
        return window.core?.ipc?.invoke(SHELL_EXT_ID, 'getUsageStats', {})
      })
      .then((statsRes: unknown) => {
        const r = statsRes as { success: boolean; data: UsageStats } | null
        if (r?.success && r.data) {
          this.tools.setUsageStats(r.data)
          this._recompute()
        }
      })
      .catch(() => {})
  }

  private _recompute(): void {
    const { savedQuery } = this.store.getState()
    this.providers.recompute(
      this.tools.tools,
      savedQuery,
      this.tools.recentToolIds,
      this.tools.usageStats
    )
  }

  private _syncProviders(): void {
    const { savedQuery } = this.store.getState()
    this.providers.sync(
      savedQuery,
      this.tools.activeTool,
      this.tools.tools,
      this.tools.recentToolIds,
      this.tools.usageStats
    )
  }

  private _syncActionProviders(): void {
    const { savedQuery } = this.store.getState()
    this.providers.syncActions(
      savedQuery,
      this.tools.activeTool,
      this.tools.tools,
      this.tools.recentToolIds,
      this.tools.usageStats
    )
  }

  private _syncListProviders(): void {
    const { savedQuery } = this.store.getState()
    this.providers.sync(
      savedQuery,
      this.tools.activeTool,
      this.tools.tools,
      this.tools.recentToolIds,
      this.tools.usageStats,
      { skipActionProviders: true }
    )
  }

  private _bindQuerySelectionSync(): void {
    let prevSelected = this.store.getState().selectedIndex
    let prevSaved = this.store.getState().savedQuery
    let prevListLen = this.providers.navigableResults.length
    let prevActiveTool = this.tools.activeTool

    this.store.subscribe(() => {
      const { selectedIndex, savedQuery } = this.store.getState()
      const navigableResults = this.providers.navigableResults
      const activeTool = this.tools.activeTool

      if (activeTool) {
        prevActiveTool = activeTool
        prevSelected = selectedIndex
        prevSaved = savedQuery
        prevListLen = navigableResults.length
        return
      }
      if (activeTool !== prevActiveTool) {
        prevActiveTool = activeTool
        return
      }
      if (
        selectedIndex === prevSelected &&
        savedQuery === prevSaved &&
        navigableResults.length === prevListLen
      ) {
        return
      }
      prevSelected = selectedIndex
      prevSaved = savedQuery
      prevListLen = navigableResults.length

      if (selectedIndex === -1 || this.refs.selectionSource === 'type') {
        if (this.query.query !== savedQuery) this.query.setQuery(savedQuery)
      } else if (navigableResults[selectedIndex]) {
        const title = navigableResults[selectedIndex].title
        if (this.query.query !== title) this.query.setQuery(title)
      }
    })
  }

  /** Handle omnibar show/hide/clear actions from the shell bridge. */
  private _bindOmniBarControl(): void {
    const shell = window.core?.shell
    if (!shell) return

    const offOmni = shell.subscribeOmniBarControl((action) => {
      if (action === 'hide') {
        this.store.setState({ showOmniBar: false })
        this.refs.input?.blur()
      } else if (action === 'show') {
        this.store.setState({ showOmniBar: true })
        // Defer until Lit re-enables the input (sync ensureShellFocus sees disabled=true).
        requestAnimationFrame(() => {
          requestAnimationFrame(() => this.ensureShellFocus())
        })
      } else if (action === 'clear') {
        this.query.reset()
        this.navigation.reset()
        this.providers.clearProviderStates()
        this._syncProviders()
        this._recompute()
      }
    })
    this.cleanups.push(offOmni)
  }

  /** Clamp window position to viewport bounds whenever store updates. */
  private _bindPositionClamp(): void {
    this.store.subscribe(() => {
      const el = this.refs.container
      if (!el) return
      const zoom = getZoom()
      const dw = window.innerWidth / zoom
      const dh = window.innerHeight / zoom
      const settings = this.store.getState().settings
      const winWidth = resolveLayoutWidth(el, settings, this.win.size.width)
      const winHeight = resolveLayoutHeight(el, settings, {
        manualHeight: this.win.size.height,
        springHeight: this.win.springHeight,
        activeTool: this.tools.activeTool !== null,
      })
      const maxX = Math.max(0, dw - winWidth)
      const maxY = Math.max(0, dh - winHeight)
      const { x, y } = this.win.position
      const clampedX = Math.max(0, Math.min(x, maxX))
      const clampedY = Math.max(0, Math.min(y, maxY))
      if (clampedX !== x || clampedY !== y) {
        this.win.setPosition({ x: clampedX, y: clampedY })
      }
    })
  }
}
