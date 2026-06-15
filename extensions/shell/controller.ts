import type { ShellBridgeSnapshot, ReactiveControllerHost } from '@nuxy/core'
import { createStore, type Store } from '../store.ts'
import { createTranslator, type Translator } from '../shell-i18n.ts'
import { getZoom } from './utils/zoom.ts'
import { SHELL_EXT_ID } from './utils.ts'
import { CommandPaletteController } from './controllers/command-palette-controller.ts'
import { ToolController } from './controllers/tool-controller.ts'
import { ProviderController } from './controllers/provider-controller.ts'
import { WindowController } from './controllers/window-controller.ts'
import { KeyboardController } from './controllers/keyboard-controller.ts'
import { InitController } from './controllers/init-controller.ts'
import { SyncController, applySettingsToDOM } from './controllers/sync-controller.ts'
import { syncToolSearchPlaceholder } from './utils/toolSearchPlaceholder.ts'
import type {
  CommandPaletteAction,
  KeyAction,
  ListItem,
  Orchestrator,
  Provider,
  ProviderState,
  ShellConfig,
  Tool,
  UsageStats,
} from './types.ts'
import type { OmnibarSection } from './utils/listResults.ts'
import { resolveOmniBarPlaceholder as computeOmniBarPlaceholder } from './utils/omniBarPlaceholder.ts'

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
  windowPosition: '1/2, 1/3',
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
  selectedIndex: number
  showOmniBar: boolean
  isInitialLoad: boolean
  copiedId: string | null
  themeStyles: Record<string, string> | null
  settings: ShellConfig
  bridge: ShellBridgeSnapshot
  holdMs: number | null
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
  isAnyListProviderLoading: boolean
}

export interface ShellControllerRefs {
  container: HTMLElement | null
  input: HTMLInputElement | null
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

  private readonly _host: ReactiveControllerHost
  private readonly _keyboard: KeyboardController
  private readonly _init: InitController
  private readonly _sync: SyncController
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
    this.tools = new ToolController(this._host, {
      onToolChange: (toolId) => {
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
      selectedIndex: -1,
      showOmniBar: true,
      isInitialLoad: true,
      copiedId: null,
      themeStyles: null,
      settings: DEFAULT_SETTINGS,
      bridge: EMPTY_SNAPSHOT,
      holdMs: null,
      extensionSummary: null,
    })

    this.refs = {
      container: null,
      input: null,
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
        this.store.setState({ query: '', savedQuery: '', selectedIndex: -1 })
        this.providers.clearProviderStates()
        this._syncProviders()
        this._recompute()
        window.core?.window?.esc?.()
      },
      setHoldMs: (ms) => this.store.setState({ holdMs: ms }),
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
        this.refs.cfg = cfg
      },
      recompute: () => this._recompute(),
      syncProviders: () => this._syncProviders(),
    })

    this._sync = new SyncController({
      getContainer: () => this.refs.container,
      getInput: () => this.refs.input,
      getCfg: () => this.refs.cfg,
      setCfg: (cfg) => {
        this.refs.cfg = cfg
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
        this.store.setState({
          query: '',
          savedQuery: '',
          selectedIndex: -1,
          showOmniBar: true,
        })
      },
      closeCommandPalette: () => this.commandPalette.close(),
      clearProviderStates: () => this.providers.clearProviderStates(),
      syncProviders: () => this._syncProviders(),
      recompute: () => this._recompute(),
      returnToShell: () => this.returnToShell(),
      applySettings: (s) => this._applySettings(s),
    })
  }

  // Merged state view for backward-compat with shell-view
  get state(): ShellControllerState {
    const core = this.store.getState()
    return {
      ...core,
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
      isAnyListProviderLoading: this.providers.isAnyListProviderLoading,
    }
  }

  connect(): void {
    this._init.load()
    this._sync.bindBridge()
    this._sync.bindSync()
    this._keyboard.bind()
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
    this._init.destroy()
    this._sync.destroy()
    this.t.destroy()
    window.core?.shell?.resetToolState()
  }

  get activeToolName(): string | null {
    return this.tools.activeToolName
  }

  get activeToolPlaceholder(): string | null {
    return this.tools.activeToolPlaceholder
  }

  resolveOmniBarPlaceholder(): string {
    return computeOmniBarPlaceholder(
      this.store.getState().bridge,
      this.activeToolName,
      this.activeToolPlaceholder,
      this.t.t
    )
  }

  setQuery(val: string): void {
    this.store.setState({ query: val })
  }

  setSavedQuery(val: string): void {
    this.store.setState({ savedQuery: val })
    this._syncProviders()
    this._recompute()
  }

  setSelectedIndex(index: number | ((prev: number) => number)): void {
    const prev = this.store.getState().selectedIndex
    const next = typeof index === 'function' ? index(prev) : index
    this.store.setState({ selectedIndex: next })
  }

  setActiveTool(toolId: string | null): void {
    this.tools.setActiveTool(toolId)
    this._syncProviders()
    this._recompute()
  }

  handleQueryChange(val: string): void {
    this.refs.selectionSource = 'type'
    this.store.setState({ query: val, savedQuery: val, selectedIndex: -1 })
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
    this.tools.setActiveTool(toolId)
    this.store.setState({ query: initialQuery, savedQuery: initialQuery })
    this.providers.clearProviderStates()
    this._recordToolUsed(toolId, queryBeforeOpen)
    this._syncProviders()
    this._recompute()
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
    const listResults = this.providers.listResults

    if (activeTool && this.store.getState().query === '' && e.key === 'Backspace') {
      e.preventDefault()
      this.returnToShell({ selectedIndex: 0 })
      return
    }

    if (activeTool) return

    if (
      e.key === 'Enter' &&
      (selectedIndex < 0 || !listResults[selectedIndex]) &&
      savedQuery.trim()
    ) {
      void this.tryOrchestratorRoute()
    }
    if (listResults.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.refs.selectionSource = 'nav'
      this.setSelectedIndex((prev) => {
        const next = prev + 1
        return next < listResults.length ? next : prev
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.refs.selectionSource = 'nav'
      this.setSelectedIndex((prev) => {
        const next = prev - 1
        return next >= -1 ? next : prev
      })
    } else if (e.key === 'ArrowRight') {
      if (selectedIndex >= 0 && listResults[selectedIndex]) {
        e.preventDefault()
        const title = listResults[selectedIndex].title
        this.store.setState({ savedQuery: title, query: title, selectedIndex: -1 })
      }
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && listResults[selectedIndex]) {
        e.preventDefault()
        void this.handleItemClick(listResults[selectedIndex])
      }
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
    setTimeout(() => this.refs.input?.focus(), 50)
  }

  toggleCommandPalette(): void {
    const wasOpen = this.commandPalette.showCommandPalette
    this.commandPalette.toggle()
    if (!wasOpen) {
      requestAnimationFrame(() => {
        const input = document
          .querySelector('nuxy-command-palette')
          ?.shadowRoot?.querySelector('.nuxy-command-palette__input') as HTMLInputElement | null
        input?.focus()
      })
    }
  }

  /** Deactivate the active tool and reset omnibar query to return to the main shell screen. */
  returnToShell(options?: { selectedIndex?: number }): void {
    const container = this.refs.container
    const fromH = container?.offsetHeight ?? 0
    const toH = this.win.restingHeight
    const shouldAnimate = container !== null && fromH > 0 && toH !== null && !this.refs.hasDragged

    this.tools.setActiveTool(null)
    this.store.setState({
      query: '',
      savedQuery: '',
      selectedIndex: options?.selectedIndex ?? -1,
      showOmniBar: true,
    })
    this._syncProviders()
    this._recompute()

    if (shouldAnimate) {
      this._sync.updatePosition(true, toH!)
      this.win.animateToHeight(null, fromH, () => {
        this.refs.input?.focus()
      })
    } else {
      setTimeout(() => this.refs.input?.focus(), 50)
    }
  }

  containerStyle(): Record<string, string | undefined> {
    const { settings, isInitialLoad } = this.store.getState()
    return this.win.containerStyle(settings, this.tools.activeTool, isInitialLoad)
  }

  private _applySettings(s: ShellConfig): void {
    this.store.setState({ settings: s })
    applySettingsToDOM(s)
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
    let prevListLen = this.providers.listResults.length
    let prevActiveTool = this.tools.activeTool

    this.store.subscribe(() => {
      const { selectedIndex, savedQuery } = this.store.getState()
      const listResults = this.providers.listResults
      const activeTool = this.tools.activeTool

      if (activeTool) {
        prevActiveTool = activeTool
        prevSelected = selectedIndex
        prevSaved = savedQuery
        prevListLen = listResults.length
        return
      }
      if (activeTool !== prevActiveTool) {
        prevActiveTool = activeTool
        return
      }
      if (
        selectedIndex === prevSelected &&
        savedQuery === prevSaved &&
        listResults.length === prevListLen
      ) {
        return
      }
      prevSelected = selectedIndex
      prevSaved = savedQuery
      prevListLen = listResults.length

      if (selectedIndex === -1 || this.refs.selectionSource === 'type') {
        if (this.store.getState().query !== savedQuery) this.store.setState({ query: savedQuery })
      } else if (listResults[selectedIndex]) {
        const title = listResults[selectedIndex].title
        if (this.store.getState().query !== title) this.store.setState({ query: title })
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
        setTimeout(() => this.refs.input?.focus(), 50)
      } else if (action === 'clear') {
        this.store.setState({ query: '', savedQuery: '', selectedIndex: -1 })
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
      const winWidth = el.offsetWidth
      const winHeight = el.offsetHeight
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
