import type { ShellBridgeSnapshot, ReactiveControllerHost } from '@nuxy/core'
import { createStore, type Store } from '../store.ts'
import { createTranslator, type Translator } from '../shell-i18n.ts'
import { getZoom } from './utils/zoom.ts'
import { parseCoordinate, SHELL_EXT_ID } from './utils.ts'
import { getDeepActiveElement, isWritingElement } from './utils/keyboard.ts'
import { CommandPaletteController } from './controllers/command-palette-controller.ts'
import { ToolController } from './controllers/tool-controller.ts'
import { ProviderController } from './controllers/provider-controller.ts'
import { WindowController } from './controllers/window-controller.ts'
import type {
  CommandPaletteAction,
  KeyAction,
  ListItem,
  Orchestrator,
  Provider,
  ProviderState,
  ShellConfig,
  Tool,
} from './types.ts'
import type { OmnibarSection } from './utils/listResults.ts'
import { resolveOmniBarPlaceholder as computeOmniBarPlaceholder } from './utils/omniBarPlaceholder.ts'
import { syncToolSearchPlaceholder } from './utils/toolSearchPlaceholder.ts'

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

const FONT_FAMILY_MAP: Record<string, string> = {
  system: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
  monospace: 'monospace',
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
  searchIcon: string | null
  bridge: ShellBridgeSnapshot
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
  private cleanups: Array<() => void> = []
  private copiedTimer: ReturnType<typeof setTimeout> | null = null
  private initialLoadTimer: ReturnType<typeof setTimeout> | null = null

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
          this.tools.recentToolIds
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
      searchIcon: null,
      bridge: EMPTY_SNAPSHOT,
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
    this.bindInit()
    this.bindBridge()
    this.bindSync()
    this.bindGlobalKeyboard()
    this.bindQuerySelectionSync()
    this.providers.recompute(this.tools.tools, '', this.tools.recentToolIds)
    this.initialLoadTimer = setTimeout(() => {
      this.store.setState({ isInitialLoad: false })
    }, 500)
  }

  disconnect(): void {
    if (this.copiedTimer) clearTimeout(this.copiedTimer)
    if (this.initialLoadTimer) clearTimeout(this.initialLoadTimer)
    this.cleanups.forEach((fn) => fn())
    this.cleanups = []
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
    this._syncProviders()
    this._recompute()
  }

  handleCopy(id: string): void {
    this.store.setState({ copiedId: id })
    if (this.copiedTimer) clearTimeout(this.copiedTimer)
    this.copiedTimer = setTimeout(() => this.store.setState({ copiedId: null }), 1200)
  }

  openTool(toolId: string, initialQuery = ''): void {
    this.tools.setActiveTool(toolId)
    this.store.setState({ query: initialQuery, savedQuery: initialQuery })
    this.providers.clearProviderStates()
    this._recordToolUsed(toolId)
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
    this.tools.setActiveTool(null)
    this.store.setState({
      query: '',
      savedQuery: '',
      selectedIndex: options?.selectedIndex ?? -1,
      showOmniBar: true,
    })
    this._syncProviders()
    this._recompute()
    setTimeout(() => this.refs.input?.focus(), 50)
  }

  containerStyle(): Record<string, string | undefined> {
    const { settings, isInitialLoad } = this.store.getState()
    return this.win.containerStyle(settings, this.tools.activeTool, isInitialLoad)
  }

  private _recordToolUsed(toolId: string): void {
    window.core?.ipc
      ?.invoke(SHELL_EXT_ID, 'recordToolUsed', toolId)
      .then((res: unknown) => {
        const r = res as { success: boolean; data: string[] } | null
        if (r?.success && Array.isArray(r.data)) {
          this.tools.setRecentToolIds(r.data)
          this._recompute()
        }
      })
      .catch(() => {})
  }

  private _recompute(): void {
    const { savedQuery } = this.store.getState()
    this.providers.recompute(this.tools.tools, savedQuery, this.tools.recentToolIds)
  }

  private _syncProviders(): void {
    const { savedQuery } = this.store.getState()
    this.providers.sync(
      savedQuery,
      this.tools.activeTool,
      this.tools.tools,
      this.tools.recentToolIds
    )
  }

  private applyTheme(name: string): void {
    window.core?.ipc
      ?.invoke('kernel', 'getThemeByName', { name })
      .then((themeRes: unknown) => {
        const tr = themeRes as {
          success: boolean
          data: { colors?: Record<string, string>; tokens?: Record<string, string> }
        } | null
        if (!tr?.success || !tr.data) return
        const { colors, tokens } = tr.data
        const root = document.documentElement
        if (colors) Object.entries(colors).forEach(([k, v]) => root.style.setProperty(`--${k}`, v))
        if (tokens) Object.entries(tokens).forEach(([k, v]) => root.style.setProperty(`--${k}`, v))
      })
      .catch(() => {})
  }

  private applySettings(s: ShellConfig): void {
    this.store.setState({ settings: s })
    if (s.zoom) document.documentElement.style.zoom = s.zoom
    if (s.font) document.body.style.fontFamily = FONT_FAMILY_MAP[s.font] || s.font
    if (s.theme) this.applyTheme(s.theme)
  }

  private bindInit(): void {
    window.core?.icons
      ?.get('search')
      .then((res: unknown) => {
        const r = res as { success?: boolean; data?: string } | string | null
        const svg = (r as { success?: boolean; data?: string })?.success
          ? (r as { success: boolean; data: string }).data
          : r
        if (typeof svg === 'string') this.store.setState({ searchIcon: svg })
      })
      .catch(() => {})

    const fetchProviders = () => {
      window.core?.ipc?.invoke('kernel', 'listProviders', {}).then((res: unknown) => {
        const r = res as { success: boolean; data: Provider[] }
        if (r.success && r.data) {
          this.providers.setProviders(r.data)
          this._syncProviders()
        }
      })
    }

    const fetchOrchestrators = () => {
      window.core?.ipc?.invoke('kernel', 'listOrchestrators', {}).then((res: unknown) => {
        const r = res as { success: boolean; data: Orchestrator[] }
        if (r.success && r.data) this.tools.setOrchestrators(r.data)
      })
    }

    const fetchTools = () => {
      window.core?.ipc?.invoke('kernel', 'listTools', {}).then((res: unknown) => {
        const r = res as { success: boolean; data: Tool[] }
        if (!r.success || !r.data) return
        const filtered = r.data.filter((t) => t.id !== SHELL_EXT_ID)
        this.tools.setTools(filtered)
        this._recompute()
      })
    }

    const fetchAll = () => {
      fetchTools()
      fetchProviders()
      fetchOrchestrators()
    }

    window.core?.ipc?.invoke('kernel', 'getConfig', {}).then((res: unknown) => {
      const r = res as { success: boolean; data: ShellConfig }
      if (r.success && r.data) {
        this.refs.cfg = r.data
        this.applySettings(r.data)
        window.dispatchEvent(new Event('resize'))
      }
    })

    fetchAll()

    window.core?.ipc?.invoke('kernel', 'getTheme', {}).then((res: unknown) => {
      const r = res as {
        success: boolean
        data: { styles?: Record<string, string>; colors?: Record<string, string> }
      }
      if (r.success && r.data?.styles) this.store.setState({ themeStyles: r.data.styles })
      if (r.success && r.data?.colors) {
        const root = document.documentElement
        Object.entries(r.data.colors).forEach(([key, val]) =>
          root.style.setProperty(`--${key}`, val)
        )
      }
    })

    window.core?.ipc
      ?.invoke('com.nuxy.settings', 'getSettings', {})
      .then((res: unknown) => {
        const r = res as { success: boolean; data: ShellConfig } | null
        if (!r?.success || !r.data) return
        this.applySettings(r.data)
      })
      .catch(() => {})

    window.core?.ipc
      ?.invoke(SHELL_EXT_ID, 'getRecentTools', {})
      .then((res: unknown) => {
        const r = res as { success: boolean; data: string[] } | null
        if (r?.success && Array.isArray(r.data)) {
          this.tools.setRecentToolIds(r.data)
          this._recompute()
        }
      })
      .catch(() => {})

    const offLocale = window.core?.events?.on('locale-changed', () => {
      fetchAll()
      const toolId = this.tools.activeTool
      if (toolId) {
        syncToolSearchPlaceholder(toolId, () => this.tools.activeTool === toolId)
      }
    })
    if (offLocale) this.cleanups.push(offLocale)
  }

  private bindBridge(): void {
    const shell = window.core?.shell
    if (!shell) return

    const sync = () => {
      this.store.setState({ bridge: shell.getSnapshot() ?? EMPTY_SNAPSHOT })
    }
    sync()
    const off = shell.subscribe(sync)
    this.cleanups.push(off)
  }

  private bindQuerySelectionSync(): void {
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

  private _updatePosition(force = false): void {
    if (!this.refs.cfg?.windowPosition || !this.refs.container) return
    if (!force && this.refs.hasDragged) return
    const parts = this.refs.cfg.windowPosition.split(/[\s,]+/)
    const winWidth = this.refs.container.offsetWidth
    const winHeight = this.refs.container.offsetHeight
    const zoom = getZoom()
    const dw = window.innerWidth / zoom
    const dh = window.innerHeight / zoom
    this.win.setPosition({
      x: parseCoordinate(parts[0], dw, winWidth),
      y: parseCoordinate(parts.length >= 2 ? parts[1] : '', dh, winHeight),
    })
  }

  private bindSync(): void {
    let lastZoom = document.documentElement.style.zoom || '100%'

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'style') {
          const currentZoom = document.documentElement.style.zoom || '100%'
          if (currentZoom !== lastZoom) {
            lastZoom = currentZoom
            this.refs.hasDragged = false
            setTimeout(() => this._updatePosition(true), 10)
          }
        }
      }
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
    this.cleanups.push(() => observer.disconnect())

    const onReset = () => {
      this.tools.setActiveTool(null)
      this.store.setState({
        query: '',
        savedQuery: '',
        selectedIndex: -1,
        showOmniBar: true,
      })
      this.commandPalette.close()
      this.providers.clearProviderStates()
      this.refs.hasDragged = false
      this._updatePosition(true)
      window.core?.shell?.resetToolState()
      this._syncProviders()
      this._recompute()
      setTimeout(() => this.refs.input?.focus(), 50)
    }

    const onFocus = () => {
      const paletteInput = document
        .querySelector('nuxy-command-palette')
        ?.shadowRoot?.querySelector('.nuxy-command-palette__input')
      if (paletteInput) {
        ;(paletteInput as HTMLInputElement).focus()
      } else {
        this.refs.input?.focus()
      }
    }

    const handleSettingsUpdate = (detail: Record<string, unknown>) => {
      if (detail) {
        this.applySettings(detail as ShellConfig)
        if (this.refs.cfg) this.refs.cfg = { ...this.refs.cfg, ...(detail as ShellConfig) }
        setTimeout(() => this._updatePosition(true), 0)
      }
    }

    const onResize = () => this._updatePosition(false)

    const offShellReset = window.core?.events?.on('shell-reset', onReset)
    window.addEventListener('focus', onFocus)
    window.addEventListener('resize', onResize)
    const offSettings = window.core?.events?.on('settings-updated', handleSettingsUpdate)

    this.cleanups.push(() => {
      offShellReset?.()
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('resize', onResize)
      offSettings?.()
    })

    const shell = window.core?.shell
    if (shell) {
      const offReturn = shell.bindReturnToShell(() => this.returnToShell())
      this.cleanups.push(offReturn)

      const offOmni = shell.subscribeOmniBarControl((action) => {
        if (action === 'hide') {
          this.store.setState({ showOmniBar: false })
          this.refs.input?.blur()
        } else if (action === 'show') {
          this.store.setState({ showOmniBar: true })
          setTimeout(() => this.refs.input?.focus(), 50)
        } else if (action === 'clear') {
          this.store.setState({ query: '', savedQuery: '', selectedIndex: -1 })
        }
      })
      this.cleanups.push(offOmni)
    }

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

  private bindGlobalKeyboard(): void {
    let holdTimer: ReturnType<typeof setTimeout> | null = null
    let holdOverlay: HTMLElement | null = null

    const clearHold = () => {
      if (holdTimer !== null) {
        clearTimeout(holdTimer)
        holdTimer = null
      }
      if (holdOverlay) {
        holdOverlay.remove()
        holdOverlay = null
      }
    }

    const matchesAction = (action: KeyAction, e: KeyboardEvent): boolean => {
      if (action.key.toLowerCase() !== e.key.toLowerCase()) return false
      const mods = action.modifiers || []
      if (mods.includes('ctrl') !== e.ctrlKey) return false
      if (mods.includes('shift') !== e.shiftKey) return false
      if (mods.includes('alt') !== e.altKey) return false
      if (mods.includes('meta') !== e.metaKey) return false
      return true
    }

    const startHold = (action: KeyAction, e: KeyboardEvent) => {
      if (holdTimer !== null) return
      const ms = action.holdMs ?? 600
      const omniBar = document.querySelector('.nuxy-shell-omni-bar')
      if (omniBar) {
        holdOverlay = document.createElement('div')
        holdOverlay.className = 'nuxy-hold-progress'
        const bar = document.createElement('div')
        bar.className = 'nuxy-hold-progress__bar'
        bar.style.setProperty('--nuxy-hold-ms', `${ms}ms`)
        holdOverlay.appendChild(bar)
        omniBar.appendChild(holdOverlay)
      }
      holdTimer = setTimeout(() => {
        holdTimer = null
        clearHold()
        action.handler()
        e.preventDefault()
      }, ms)
    }

    const deactivateTool = () => {
      clearHold()
      this.returnToShell({ selectedIndex: 0 })
    }

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const { activeTool } = this.tools
      const showCommandPalette = this.commandPalette.showCommandPalette

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if ((window.core?.shell?.getToolActions()?.length ?? 0) > 0) {
          this.toggleCommandPalette()
        }
        return
      }

      if (e.key === 'Escape') {
        if (showCommandPalette) {
          this.closeCommandPalette()
          return
        }
        if (activeTool) {
          const actions = window.core?.shell?.getKeyActionsGetter()?.()
          if (actions && actions.length > 0) {
            const matched = actions.find((a) => {
              if (!matchesAction(a, e)) return false
              if (typeof a.activeOn === 'function' && !a.activeOn()) return false
              return true
            })
            if (matched) {
              if (matched.trigger === 'hold') {
                if (!e.repeat) startHold(matched, e)
                e.preventDefault()
              } else {
                matched.handler()
                e.preventDefault()
              }
              return
            }
          }
          deactivateTool()
        } else {
          clearHold()
          this.store.setState({ query: '', savedQuery: '', selectedIndex: -1 })
          window.core?.window?.esc?.()
        }
        return
      }

      if (showCommandPalette) return

      if (activeTool) {
        const target = (e.composedPath?.()[0] || e.target) as HTMLElement
        const isInput = isWritingElement(target)
        const isOmniBar = target?.classList?.contains('nuxy-shell-omni-bar__input')
        const actions = window.core?.shell?.getKeyActionsGetter()?.()
        if (actions && actions.length > 0) {
          const matched = actions.find((a) => {
            if (!matchesAction(a, e)) return false
            if (e.repeat && !a.allowRepeat) return false
            if (isInput) {
              if (isOmniBar) {
                if (!a.modifiers?.length && a.key.length === 1) return false
              } else {
                if (!a.modifiers?.length) return false
              }
            }
            if (typeof a.activeOn === 'function' && !a.activeOn()) return false
            return true
          })
          if (matched) {
            if (matched.trigger === 'hold') {
              if (!e.repeat) startHold(matched, e)
              e.preventDefault()
              return
            }
            matched.handler()
            e.preventDefault()
            return
          }
        }
        if (!isInput) {
          window.dispatchEvent(
            new CustomEvent('nuxy-shell-omni-bar-keydown', {
              detail: {
                key: e.key,
                code: e.code,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
              },
            })
          )
          if (
            ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Space'].includes(e.key)
          ) {
            e.preventDefault()
          }
        }
      }
    }

    const handleGlobalKeyUp = (e: KeyboardEvent) => {
      if (holdTimer !== null) {
        const actions = window.core?.shell?.getKeyActionsGetter()?.()
        const held = actions?.find((a) => a.trigger === 'hold' && matchesAction(a, e))
        if (held) clearHold()
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    window.addEventListener('keyup', handleGlobalKeyUp)
    this.cleanups.push(() => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
      window.removeEventListener('keyup', handleGlobalKeyUp)
      clearHold()
    })
  }
}
