import type { ShellBridgeSnapshot } from '@nuxy/core'
import { createStore, type Store } from '../ce-utils.ts'
import { createTranslator, type Translator } from '../shell-i18n.ts'
import { buildOmnibarSections, type OmnibarSection } from './utils/listResults.ts'
import { getZoom } from './utils/zoom.ts'
import { parseCoordinate, SHELL_EXT_ID } from './utils.ts'
import type {
  CommandPaletteAction,
  KeyAction,
  ListItem,
  Orchestrator,
  Position,
  Provider,
  ProviderState,
  ShellConfig,
  Size,
  Tool,
} from './types.ts'

const EMPTY_SNAPSHOT: ShellBridgeSnapshot = {
  toolActions: [],
  keyActionHints: [],
  omniBarPortal: null,
  footerPortal: null,
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

export interface ShellControllerState {
  query: string
  savedQuery: string
  selectedIndex: number
  activeTool: string | null
  showOmniBar: boolean
  showCommandPalette: boolean
  isInitialLoad: boolean
  copiedId: string | null
  position: Position
  size: Size
  isDraggingState: boolean
  tools: Tool[]
  providers: Provider[]
  orchestrators: Orchestrator[]
  themeStyles: Record<string, string> | null
  settings: ShellConfig
  searchIcon: string | null
  providerStates: Record<string, ProviderState>
  recentToolIds: string[]
  bridge: ShellBridgeSnapshot
  omnibarSections: OmnibarSection[]
  listResults: ListItem[]
  isAnyListProviderLoading: boolean
}

export interface ShellControllerRefs {
  container: HTMLElement | null
  input: HTMLInputElement | null
  cfg: ShellConfig | null
  queryGeneration: number
  hasDragged: boolean
  selectionSource: 'type' | 'nav'
}

export class ShellController {
  readonly store: Store<ShellControllerState>
  readonly refs: ShellControllerRefs
  readonly t: Translator

  private cleanups: Array<() => void> = []
  private isDragging = false
  private providerTimer: ReturnType<typeof setTimeout> | null = null
  private copiedTimer: ReturnType<typeof setTimeout> | null = null
  private initialLoadTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private onUpdate: () => void) {
    const zoom = getZoom()
    const dw = window.innerWidth / zoom
    const dh = window.innerHeight / zoom

    this.store = createStore<ShellControllerState>({
      query: '',
      savedQuery: '',
      selectedIndex: -1,
      activeTool: null,
      showOmniBar: true,
      showCommandPalette: false,
      isInitialLoad: true,
      copiedId: null,
      position: { x: Math.round((dw - 800) / 2), y: Math.round(dh * 0.15) },
      size: { width: null, height: null },
      isDraggingState: false,
      tools: [],
      providers: [],
      orchestrators: [],
      themeStyles: null,
      settings: DEFAULT_SETTINGS,
      searchIcon: null,
      providerStates: {},
      recentToolIds: [],
      bridge: EMPTY_SNAPSHOT,
      omnibarSections: [],
      listResults: [],
      isAnyListProviderLoading: false,
    })

    this.refs = {
      container: null,
      input: null,
      cfg: null,
      queryGeneration: 0,
      hasDragged: false,
      selectionSource: 'type',
    }

    this.t = createTranslator(SHELL_EXT_ID, () => this.onUpdate())

    this.store.subscribe(() => this.onUpdate())
  }

  connect(): void {
    this.bindInit()
    this.bindBridge()
    this.bindSync()
    this.bindGlobalKeyboard()
    this.bindQuerySelectionSync()
    this.recomputeListResults()
    this.initialLoadTimer = setTimeout(() => {
      this.store.setState({ isInitialLoad: false })
    }, 500)
  }

  disconnect(): void {
    if (this.providerTimer) clearTimeout(this.providerTimer)
    if (this.copiedTimer) clearTimeout(this.copiedTimer)
    if (this.initialLoadTimer) clearTimeout(this.initialLoadTimer)
    this.cleanups.forEach((fn) => fn())
    this.cleanups = []
    this.t.destroy()
    window.core?.shell?.resetToolState()
  }

  get state(): ShellControllerState {
    return this.store.getState()
  }

  get activeToolName(): string | null {
    const { activeTool, tools } = this.state
    if (!activeTool) return null
    const tool = tools.find((t) => t.id === activeTool)
    return tool?.manifest.name ?? activeTool
  }

  get activeToolPlaceholder(): string | null {
    const { activeTool, tools } = this.state
    if (!activeTool) return null
    const tool = tools.find((t) => t.id === activeTool)
    return (tool?.manifest as { placeholder?: string } | undefined)?.placeholder ?? null
  }

  itemClass(index: number): string {
    const { selectedIndex, themeStyles } = this.state
    return index === selectedIndex
      ? (themeStyles?.itemActive ?? 'nuxy-shell-results-item nuxy-shell-results-item--active')
      : (themeStyles?.itemInactive ?? 'nuxy-shell-results-item')
  }

  setQuery(val: string): void {
    this.store.setState({ query: val })
  }

  setSavedQuery(val: string): void {
    this.store.setState({ savedQuery: val })
    this.syncProviders()
    this.recomputeListResults()
  }

  setSelectedIndex(index: number | ((prev: number) => number)): void {
    const prev = this.state.selectedIndex
    const next = typeof index === 'function' ? index(prev) : index
    this.store.setState({ selectedIndex: next })
  }

  setActiveTool(toolId: string | null): void {
    this.store.setState({ activeTool: toolId })
    this.syncProviders()
    this.recomputeListResults()
    if (toolId) window.core?.shell?.resetToolState()
  }

  handleQueryChange(val: string): void {
    this.refs.selectionSource = 'type'
    this.store.setState({ query: val, savedQuery: val, selectedIndex: -1 })
    this.syncProviders()
    this.recomputeListResults()
  }

  handleCopy(id: string): void {
    this.store.setState({ copiedId: id })
    if (this.copiedTimer) clearTimeout(this.copiedTimer)
    this.copiedTimer = setTimeout(() => this.store.setState({ copiedId: null }), 1200)
  }

  openTool(toolId: string, initialQuery = ''): void {
    this.setActiveTool(toolId)
    this.store.setState({ providerStates: {}, query: initialQuery, savedQuery: initialQuery })
    this.recordToolUsed(toolId)
    this.syncProviders()
    this.recomputeListResults()
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
    const { savedQuery, orchestrators } = this.state
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
    const { activeTool, query, savedQuery, selectedIndex, listResults } = this.state

    if (activeTool && query === '' && e.key === 'Backspace') {
      e.preventDefault()
      this.setActiveTool(null)
      this.store.setState({ query: '', savedQuery: '', selectedIndex: 0 })
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
    if (e.button !== 0) return
    if (!(e.target instanceof HTMLInputElement)) e.preventDefault()
    this.isDragging = true
    this.store.setState({ isDraggingState: true })
    this.refs.hasDragged = true

    let zoom = getZoom()
    const startClientX = e.clientX
    const startClientY = e.clientY
    const { position } = this.state
    const startPosX = position.x
    const startPosY = position.y

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!this.isDragging) return
      const deltaX = (moveEvent.clientX - startClientX) / zoom
      const deltaY = (moveEvent.clientY - startClientY) / zoom
      const container = this.refs.container
      const winWidth = container ? container.offsetWidth : 0
      const winHeight = container ? container.offsetHeight : 0
      const dw = window.innerWidth / zoom
      const dh = window.innerHeight / zoom
      this.store.setState({
        position: {
          x: Math.max(0, Math.min(startPosX + deltaX, Math.max(0, dw - winWidth))),
          y: Math.max(0, Math.min(startPosY + deltaY, Math.max(0, dh - winHeight))),
        },
      })
    }

    const onMouseUp = () => {
      this.isDragging = false
      this.store.setState({ isDraggingState: false })
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  handleResizeMouseDown(e: MouseEvent, direction: string): void {
    e.preventDefault()
    e.stopPropagation()
    this.isDragging = true
    this.store.setState({ isDraggingState: true })
    this.refs.hasDragged = true

    const zoom = getZoom()
    const startClientX = e.clientX
    const startClientY = e.clientY
    const container = this.refs.container!
    const startWidth = container.offsetWidth
    const startHeight = container.offsetHeight
    const { position } = this.state
    const startX = position.x
    const startY = position.y

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!this.isDragging) return
      const deltaX = (moveEvent.clientX - startClientX) / zoom
      const deltaY = (moveEvent.clientY - startClientY) / zoom

      let newWidth = startWidth
      let newHeight = startHeight
      let newX = startX
      let newY = startY

      if (direction.includes('e')) newWidth = startWidth + deltaX
      if (direction.includes('w')) {
        newWidth = startWidth - deltaX
        newX = startX + deltaX
      }
      if (direction.includes('s')) newHeight = startHeight + deltaY
      if (direction.includes('n')) {
        newHeight = startHeight - deltaY
        newY = startY + deltaY
      }

      if (newWidth < 300) {
        if (direction.includes('w')) newX -= 300 - newWidth
        newWidth = 300
      }
      if (newHeight < 100) {
        if (direction.includes('n')) newY -= 100 - newHeight
        newHeight = 100
      }

      const patch: Partial<ShellControllerState> = { size: { width: newWidth, height: newHeight } }
      if (newX !== startX || newY !== startY) patch.position = { x: newX, y: newY }
      this.store.setState(patch)
    }

    const onMouseUp = () => {
      this.isDragging = false
      this.store.setState({ isDraggingState: false })
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  closeCommandPalette(): void {
    this.store.setState({ showCommandPalette: false })
    setTimeout(() => this.refs.input?.focus(), 50)
  }

  toggleCommandPalette(): void {
    this.store.setState({ showCommandPalette: !this.state.showCommandPalette })
  }

  containerStyle(): Record<string, string | undefined> {
    const { position, size, settings, activeTool, isDraggingState, isInitialLoad } = this.state
    const transition =
      isDraggingState || isInitialLoad
        ? 'none'
        : 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1), top 0.3s cubic-bezier(0.16, 1, 0.3, 1), width 0.3s cubic-bezier(0.16, 1, 0.3, 1), height 0.3s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1), max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s cubic-bezier(0.16, 1, 0.3, 1)'

    return {
      left: `${position.x}px`,
      top: `${position.y}px`,
      width: size.width ? `${size.width}px` : settings?.windowWidth ? `${settings.windowWidth}px` : undefined,
      height: size.height
        ? `${size.height}px`
        : activeTool
          ? `${settings?.windowMaxHeight ?? 600}px`
          : undefined,
      maxWidth: size.width ? 'none' : settings?.windowWidth ? `${settings.windowWidth}px` : undefined,
      maxHeight: size.height ? 'none' : `${settings?.windowMaxHeight ?? 600}px`,
      opacity: settings?.opacity !== undefined ? String(settings.opacity) : undefined,
      transition,
    }
  }

  private recordToolUsed(toolId: string): void {
    window.core?.ipc
      ?.invoke(SHELL_EXT_ID, 'recordToolUsed', toolId)
      .then((res: unknown) => {
        const r = res as { success: boolean; data: string[] } | null
        if (r?.success && Array.isArray(r.data)) {
          this.store.setState({ recentToolIds: r.data })
          this.recomputeListResults()
        }
      })
      .catch(() => {})
  }

  private recomputeListResults(): void {
    const { tools, savedQuery, providerStates, recentToolIds, providers } = this.state
    const { sections, flatItems } = buildOmnibarSections(
      tools,
      savedQuery,
      providerStates,
      recentToolIds,
      providers
    )
    const isAnyListProviderLoading = Object.values(providerStates).some(
      (s) => s.type === 'list' && s.loading
    )
    this.store.setState({
      omnibarSections: sections,
      listResults: flatItems,
      isAnyListProviderLoading,
    })
  }

  private syncProviders(): void {
    if (this.providerTimer) clearTimeout(this.providerTimer)

    const { activeTool, savedQuery, providers } = this.state
    if (activeTool || savedQuery.trim().length === 0) {
      this.store.setState({ providerStates: {} })
      this.recomputeListResults()
      return
    }

    const generation = ++this.refs.queryGeneration
    this.providerTimer = setTimeout(() => {
      const initialStates: Record<string, ProviderState> = {}
      providers.forEach((provider) => {
        const type = (provider.manifest?.providerType as ProviderState['type']) || 'list'
        const name = provider.manifest?.name || provider.id
        initialStates[provider.id] = { loading: true, items: [], type, name }
      })
      this.store.setState({ providerStates: initialStates })
      this.recomputeListResults()

      providers.forEach((provider) => {
        const type = (provider.manifest?.providerType as ProviderState['type']) || 'list'
        const name = provider.manifest?.name || provider.id
        window.core?.ipc
          ?.invoke(provider.id, 'eval', { text: savedQuery })
          .then((res: unknown) => {
            if (generation !== this.refs.queryGeneration) return
            const r = res as { success: boolean; data?: { items?: ProviderState['items'] } } | null
            this.store.setState((prev) => ({
              providerStates: {
                ...prev.providerStates,
                [provider.id]: {
                  loading: false,
                  items: r?.success && r.data?.items ? r.data.items : [],
                  type,
                  name,
                },
              },
            }))
            this.recomputeListResults()
          })
          .catch(() => {
            if (generation !== this.refs.queryGeneration) return
            this.store.setState((prev) => ({
              providerStates: {
                ...prev.providerStates,
                [provider.id]: { loading: false, items: [], type, name },
              },
            }))
            this.recomputeListResults()
          })
      })
    }, 50)
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
          this.store.setState({ providers: r.data })
          this.syncProviders()
        }
      })
    }

    const fetchOrchestrators = () => {
      window.core?.ipc?.invoke('kernel', 'listOrchestrators', {}).then((res: unknown) => {
        const r = res as { success: boolean; data: Orchestrator[] }
        if (r.success && r.data) this.store.setState({ orchestrators: r.data })
      })
    }

    const fetchTools = () => {
      window.core?.ipc?.invoke('kernel', 'listTools', {}).then((res: unknown) => {
        const r = res as { success: boolean; data: Tool[] }
        if (!r.success || !r.data) return
        const filtered = r.data.filter((t) => t.id !== SHELL_EXT_ID)
        this.store.setState({ tools: filtered })
        this.recomputeListResults()
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
          this.store.setState({ recentToolIds: r.data })
          this.recomputeListResults()
        }
      })
      .catch(() => {})

    const offLocale = window.core?.events?.on('locale-changed', fetchAll)
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
    let prevSelected = this.state.selectedIndex
    let prevSaved = this.state.savedQuery
    let prevListLen = this.state.listResults.length
    let prevActiveTool = this.state.activeTool

    this.store.subscribe(() => {
      const { selectedIndex, savedQuery, listResults, activeTool } = this.state
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
        if (this.state.query !== savedQuery) this.store.setState({ query: savedQuery })
      } else if (listResults[selectedIndex]) {
        const title = listResults[selectedIndex].title
        if (this.state.query !== title) this.store.setState({ query: title })
      }
    })
  }

  private updatePosition(force = false): void {
    if (!this.refs.cfg?.windowPosition || !this.refs.container) return
    if (!force && this.refs.hasDragged) return
    const parts = this.refs.cfg.windowPosition.split(/[\s,]+/)
    const winWidth = this.refs.container.offsetWidth
    const winHeight = this.refs.container.offsetHeight
    const zoom = getZoom()
    const dw = window.innerWidth / zoom
    const dh = window.innerHeight / zoom
    this.store.setState({
      position: {
        x: parseCoordinate(parts[0], dw, winWidth),
        y: parseCoordinate(parts.length >= 2 ? parts[1] : '', dh, winHeight),
      },
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
            setTimeout(() => this.updatePosition(true), 10)
          }
        }
      }
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
    this.cleanups.push(() => observer.disconnect())

    const onReset = () => {
      this.store.setState({
        query: '',
        savedQuery: '',
        providerStates: {},
        activeTool: null,
        selectedIndex: -1,
        showOmniBar: true,
        showCommandPalette: false,
      })
      this.refs.hasDragged = false
      this.updatePosition(true)
      window.core?.shell?.resetToolState()
      this.syncProviders()
      this.recomputeListResults()
      setTimeout(() => this.refs.input?.focus(), 50)
    }

    const onFocus = () => {
      const paletteInput = document.querySelector('.nuxy-command-palette__input')
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
        setTimeout(() => this.updatePosition(true), 0)
      }
    }

    const onResize = () => this.updatePosition(false)

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
      const offOmni = shell.subscribeOmniBarControl((action) => {
        if (action === 'hide') {
          this.store.setState({ showOmniBar: false })
          this.refs.input?.blur()
        } else if (action === 'show') {
          this.store.setState({ showOmniBar: true })
          setTimeout(() => this.refs.input?.focus(), 50)
        } else if (action === 'clear') {
          this.store.setState({ query: '' })
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
      const { position } = this.state
      const clampedX = Math.max(0, Math.min(position.x, maxX))
      const clampedY = Math.max(0, Math.min(position.y, maxY))
      if (clampedX !== position.x || clampedY !== position.y) {
        this.store.setState({ position: { x: clampedX, y: clampedY } })
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
      this.setActiveTool(null)
      this.store.setState({ query: '', savedQuery: '', selectedIndex: 0, showOmniBar: true })
      setTimeout(() => this.refs.input?.focus(), 50)
    }

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const { activeTool, showCommandPalette } = this.state

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
        const target = e.target as HTMLElement
        const isInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
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
        if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
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
