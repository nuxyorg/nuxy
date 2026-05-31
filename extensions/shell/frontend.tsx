const React = window.React
const { useState, useEffect, useRef, useLayoutEffect, useMemo } = React

import type {
  Tool,
  Provider,
  Orchestrator,
  ShellConfig,
  ListItem,
  ProviderState,
  KeyAction,
  CommandPaletteAction,
  Position,
  Size,
} from './types.ts'

const _imp = new Function('url', 'return import(url)')
const { parseCoordinate, ensureShellStyles, SHELL_EXT_ID } = await _imp(
  'nuxy-ext://com.nuxy.shell/utils.ts'
)
const { default: CommandPalette } = await _imp('nuxy-ext://com.nuxy.shell/CommandPalette.tsx')
const { ResultCard, CompareCard } = await _imp('nuxy-ext://com.nuxy.shell/ResultCard.tsx')
const { useShellInit, useProviders, useKeyboard, useToolHistory } = await _imp(
  'nuxy-ext://com.nuxy.shell/hooks.tsx'
)

ensureShellStyles()

interface Props {
  query: string
}

export default function ShellView({ query: _queryProp }: Props) {
  const {
    ShortcutBar,
    ShortcutHint,
    ShortcutSep,
    Kbd,
    List,
    ListItem,
    ListItemBody,
    ListItemText,
    ListItemActions,
    Toaster,
  } = window.UI || {}

  const [query, setQuery] = useState<string>('')
  const [savedQuery, setSavedQuery] = useState<string>('')
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)
  const [tools, setTools] = useState<Tool[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [orchestrators, setOrchestrators] = useState<Orchestrator[]>([])
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [ToolComponent, setToolComponent] = useState<React.ComponentType<{
    query: string
    extensionId?: string
  }> | null>(null)
  const [showOmniBar, setShowOmniBar] = useState<boolean>(true)
  const [themeStyles, setThemeStyles] = useState<Record<string, string> | null>(null)
  const [showCommandPalette, setShowCommandPalette] = useState<boolean>(false)
  const [toolActions, setToolActions] = useState<CommandPaletteAction[]>([])
  const [position, setPosition] = useState<Position>({
    x: Math.round((window.innerWidth - 800) / 2),
    y: Math.round(window.innerHeight * 0.15),
  })
  const [size, setSize] = useState<Size>({ width: null, height: null })
  const [settings, setSettings] = useState<ShellConfig>({
    windowWidth: 800,
    windowMaxHeight: 600,
    opacity: 1,
    theme: 'dark',
    zoom: '100%',
    font: 'system',
    windowPosition: '1/2, 1/3',
  })
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true)

  useEffect(() => {
    const t = setTimeout(() => setIsInitialLoad(false), 500)
    return () => clearTimeout(t)
  }, [])

  const [providerStates, setProviderStates] = useState<Record<string, ProviderState>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [searchIcon, setSearchIcon] = useState<string | null>(null)
  const [footerHints, setFooterHints] = useState<React.ReactNode | null>(null)

  const keyActionsGetterRef = useRef<(() => KeyAction[]) | null>(null)
  const toolActionsRef = useRef<CommandPaletteAction[]>([])
  const [keyActionHints, setKeyActionHints] = useState<KeyAction[]>([])

  const cfgRef = useRef<ShellConfig | null>(null)
  const hasDragged = useRef<boolean>(false)
  const isDragging = useRef<boolean>(false)
  const [isDraggingState, setIsDraggingState] = useState<boolean>(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const omniBarRef = useRef<HTMLDivElement | null>(null)
  const queryGeneration = useRef<number>(0)

  // Initialize hooks
  useShellInit({
    cfgRef,
    setTools,
    setProviders,
    setOrchestrators,
    setThemeStyles,
    setSettings,
    setSearchIcon,
    SHELL_EXT_ID,
  })
  const { isAnyListProviderLoading } = useProviders({
    activeTool,
    savedQuery,
    providers,
    providerStates,
    setProviderStates,
    queryGeneration,
  })
  useKeyboard({
    activeTool,
    showCommandPalette,
    setShowCommandPalette,
    inputRef,
    setActiveTool,
    setToolComponent,
    setQuery,
    setSavedQuery,
    setSelectedIndex,
    setShowOmniBar,
    keyActionsGetterRef,
    toolActionsRef,
  })
  const { recentToolIds, recordToolUsed } = useToolHistory(SHELL_EXT_ID)

  useEffect(() => {
    if (containerRef.current) {
      window.dispatchEvent(
        new CustomEvent('nuxy-shell-mounted', {
          detail: { container: containerRef.current },
        })
      )
    }
  }, [])

  const handleCopy = (id: string) => {
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1200)
  }

  const listResults = useMemo<ListItem[]>(() => {
    const toolItems: ListItem[] = tools
      .map((t) => ({
        id: t.id,
        title: t.manifest.name,
        subtitle: (t.manifest as { id?: string }).id || 'Tool',
        isTool: true,
        value: t.manifest.name,
      }))

    let filteredTools: ListItem[]
    if (savedQuery.trim().length > 0) {
      filteredTools = toolItems.filter(
        (item) =>
          item.title.toLowerCase().includes(savedQuery.toLowerCase()) ||
          item.id.toLowerCase().includes(savedQuery.toLowerCase())
      )
    } else if (recentToolIds.length > 0) {
      const recentSet = new Set(recentToolIds)
      const recent = [...new Set(recentToolIds)]
        .map((id) => toolItems.find((t) => t.id === id))
        .filter((x): x is ListItem => Boolean(x))
      const rest = toolItems.filter((t) => !recentSet.has(t.id))
      filteredTools = [...recent, ...rest]
    } else {
      filteredTools = toolItems
    }

    const finalResults: ListItem[] = []
    const seenIds = new Set<string>()

    filteredTools.forEach((item) => {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id)
        finalResults.push(item)
      }
    })

    Object.keys(providerStates).forEach((provId) => {
      const state = providerStates[provId]
      if (state && state.type === 'list' && !state.loading && state.items) {
        state.items.forEach((item) => {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id)
            finalResults.push(item)
          }
        })
      }
    })

    return finalResults
  }, [tools, savedQuery, providerStates, recentToolIds])

  const getZoom = (): number => {
    const z = document.documentElement.style.zoom
    if (!z) return 1
    if (z.endsWith('%')) return parseFloat(z) / 100
    return parseFloat(z) || 1
  }

  useLayoutEffect(() => {
    if (!containerRef.current) return
    const zoom = getZoom()
    const dw = window.innerWidth / zoom
    const dh = window.innerHeight / zoom
    const winWidth = containerRef.current.offsetWidth
    const winHeight = containerRef.current.offsetHeight

    const maxX = Math.max(0, dw - winWidth)
    const maxY = Math.max(0, dh - winHeight)
    const clampedX = Math.max(0, Math.min(position.x, maxX))
    const clampedY = Math.max(0, Math.min(position.y, maxY))

    if (clampedX !== position.x || clampedY !== position.y) {
      setPosition({ x: clampedX, y: clampedY })
    }
  }, [position.x, position.y, listResults, activeTool])

  useEffect(() => {
    let lastZoom = document.documentElement.style.zoom || '100%'

    const updatePosition = (force = false) => {
      if (
        !cfgRef.current?.windowPosition ||
        !containerRef.current ||
        (!force && hasDragged.current)
      )
        return
      const parts = cfgRef.current.windowPosition.split(/[\s,]+/)
      const winWidth = containerRef.current.offsetWidth
      const winHeight = containerRef.current.offsetHeight
      const zoom = getZoom()
      const dw = window.innerWidth / zoom
      const dh = window.innerHeight / zoom
      setPosition({
        x: parseCoordinate(parts[0], dw, winWidth),
        y: parseCoordinate(parts.length >= 2 ? parts[1] : '', dh, winHeight),
      })
    }

    const observer = new MutationObserver((mutations: MutationRecord[]) => {
      for (const m of mutations) {
        if (m.attributeName === 'style') {
          const currentZoom = document.documentElement.style.zoom || '100%'
          if (currentZoom !== lastZoom) {
            lastZoom = currentZoom
            hasDragged.current = false
            setTimeout(() => updatePosition(true), 10)
          }
        }
      }
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })

    const onReset = () => {
      setQuery('')
      setSavedQuery('')
      setProviderStates({})
      setActiveTool(null)
      setToolComponent(null)
      setSelectedIndex(-1)
      setShowOmniBar(true)
      setShowCommandPalette(false)
      hasDragged.current = false
      updatePosition(true)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
    const onFocus = () => {
      const paletteInput = document.querySelector('.nuxy-command-palette__input')
      if (paletteInput) {
        ;(paletteInput as HTMLInputElement).focus()
      } else {
        inputRef.current?.focus()
      }
    }
    const handleSettingsUpdate = (e: Event) => {
      const detail = (e as CustomEvent<ShellConfig>).detail
      if (detail) {
        setSettings(detail)
        if (cfgRef.current) cfgRef.current = { ...cfgRef.current, ...detail }
        setTimeout(() => updatePosition(true), 0)
      }
    }

    window.addEventListener('nuxy-shell-reset', onReset)
    window.addEventListener('focus', onFocus)
    window.addEventListener('resize', () => updatePosition(false))
    window.addEventListener('nuxy-settings-updated', handleSettingsUpdate)

    return () => {
      observer.disconnect()
      window.removeEventListener('nuxy-shell-reset', onReset)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('resize', () => updatePosition(false))
      window.removeEventListener('nuxy-settings-updated', handleSettingsUpdate)
    }
  }, [])

  useEffect(() => {
    const handleActions = (e: Event) =>
      setToolActions((e as CustomEvent<CommandPaletteAction[]>).detail || [])
    window.addEventListener('nuxy-register-actions', handleActions)
    return () => window.removeEventListener('nuxy-register-actions', handleActions)
  }, [])

  useEffect(() => {
    setToolActions([])
  }, [activeTool])

  useEffect(() => {
    toolActionsRef.current = toolActions
  }, [toolActions])

  useEffect(() => {
    const computeHints = (): KeyAction[] => {
      const actions = keyActionsGetterRef.current?.()
      if (!actions) return []
      return actions.filter((a) => a.hint && (typeof a.activeOn !== 'function' || a.activeOn()))
    }

    const handleRegister = (e: Event) => {
      const detail = (e as CustomEvent<{ getActions: () => KeyAction[] } | null>).detail
      if (!detail) {
        keyActionsGetterRef.current = null
        setKeyActionHints([])
      } else {
        keyActionsGetterRef.current = detail.getActions
        setKeyActionHints(computeHints())
      }
    }

    const handleHintsChanged = () => {
      setKeyActionHints(computeHints())
    }

    window.addEventListener('nuxy-register-key-actions', handleRegister)
    window.addEventListener('nuxy-key-hints-changed', handleHintsChanged)
    return () => {
      window.removeEventListener('nuxy-register-key-actions', handleRegister)
      window.removeEventListener('nuxy-key-hints-changed', handleHintsChanged)
    }
  }, [])

  useEffect(() => {
    keyActionsGetterRef.current = null
    setKeyActionHints([])
  }, [activeTool])

  useEffect(() => {
    const handleFooterHints = (e: Event) =>
      setFooterHints((e as CustomEvent<React.ReactNode>).detail || null)
    window.addEventListener('nuxy-shell-footer-hints', handleFooterHints)
    return () => window.removeEventListener('nuxy-shell-footer-hints', handleFooterHints)
  }, [])

  useEffect(() => {
    setFooterHints(null)
  }, [activeTool])

  useEffect(() => {
    const handleOmniBarControl = (e: Event) => {
      const { action } = (e as CustomEvent<{ action: string }>).detail
      if (action === 'hide') {
        setShowOmniBar(false)
        inputRef.current?.blur()
      } else if (action === 'show') {
        setShowOmniBar(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      } else if (action === 'clear') {
        setQuery('')
      }
    }
    window.addEventListener('nuxy-shell-omni-bar-control', handleOmniBarControl)
    return () => window.removeEventListener('nuxy-shell-omni-bar-control', handleOmniBarControl)
  }, [])

  useEffect(() => {
    if (activeTool) return
    if (selectedIndex === -1) {
      setQuery(savedQuery)
    } else if (listResults[selectedIndex]) {
      setQuery(listResults[selectedIndex].title)
    }
  }, [selectedIndex, savedQuery, listResults, activeTool])

  const openTool = (toolId: string, initialQuery: string = '') => {
    setActiveTool(toolId)
    setProviderStates({})
    setQuery(initialQuery)
    setSavedQuery(initialQuery)
    recordToolUsed(toolId)
    const dynamicImport = new Function('url', 'return import(url)')
    dynamicImport(`nuxy-ext://${toolId}/frontend.js`)
      .then((module: { default: React.ComponentType<{ query: string; extensionId?: string }> }) =>
        setToolComponent(() => module.default)
      )
      .catch(() => {})
  }

  const handleItemClick = async (item: ListItem) => {
    if (item.execute) {
      try {
        const res = await window.core.ipc.invoke(item.id, item.execute.channel, item.execute.payload)
        const r = res as { success: boolean; data?: { toolId?: string; query?: string } } | null
        if (r?.success && r.data?.toolId) {
          openTool(r.data.toolId, r.data.query || '')
        }
      } catch (e) {
        console.error('Failed to execute item action:', e)
      }
    } else if (item.isTool) {
      openTool(item.id, (item as any).initialQuery || '')
    }
  }

  const tryOrchestratorRoute = async () => {
    if (!savedQuery.trim() || orchestrators.length === 0) return
    try {
      const res = await window.core.ipc.invoke(orchestrators[0].id, 'route', { text: savedQuery })
      const r = res as { ok: boolean; data?: { toolCalled?: string; initialQuery?: string } } | null
      if (r?.ok && r.data?.toolCalled) {
        openTool(r.data.toolCalled, r.data.initialQuery)
      }
    } catch {
      // silently ignore orchestrator route failures
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (activeTool && query === '' && e.key === 'Backspace') {
      e.preventDefault()
      setActiveTool(null)
      setToolComponent(null)
      setQuery('')
      setSavedQuery('')
      setSelectedIndex(0)
      return
    }

    // If we're inside a tool, let useKeyboard handle forwarding events via IPC/CustomEvent
    // BUT we still need to handle Arrow keys for navigation if not inside a tool
    if (activeTool) return

    if (e.key === 'Enter' && selectedIndex < 0 && savedQuery.trim()) {
      void tryOrchestratorRoute()
    }
    if (listResults.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => {
        const next = prev + 1
        return next < listResults.length ? next : prev
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => {
        const next = prev - 1
        return next >= -1 ? next : prev
      })
    } else if (e.key === 'ArrowRight') {
      if (selectedIndex === 0 && listResults[0]) {
        e.preventDefault()
        setSavedQuery(listResults[0].title)
        setQuery(listResults[0].title)
        setSelectedIndex(-1)
      }
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && listResults[selectedIndex]) {
        e.preventDefault()
        handleItemClick(listResults[selectedIndex])
      }
    }
  }

  const activeTool_ = activeTool ? tools.find((t) => t.id === activeTool) : null
  const activeToolName = activeTool_?.manifest.name ?? activeTool ?? null
  const activeToolPlaceholder = activeTool_?.manifest.placeholder ?? null

  const itemClass = (index: number): string =>
    index === selectedIndex
      ? (themeStyles?.itemActive ?? 'nuxy-shell-results-item nuxy-shell-results-item--active')
      : (themeStyles?.itemInactive ?? 'nuxy-shell-results-item')

  const handleDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    if (!(e.target instanceof HTMLInputElement)) {
      e.preventDefault()
    }
    isDragging.current = true
    setIsDraggingState(true)
    hasDragged.current = true

    let zoom = 1
    const zoomStyle = document.documentElement.style.zoom
    if (zoomStyle) {
      zoom = zoomStyle.endsWith('%') ? parseFloat(zoomStyle) / 100 : parseFloat(zoomStyle)
    }
    if (isNaN(zoom) || zoom <= 0) zoom = 1

    const startClientX = e.clientX
    const startClientY = e.clientY
    const startPosX = position.x
    const startPosY = position.y

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return
      const deltaX = (moveEvent.clientX - startClientX) / zoom
      const deltaY = (moveEvent.clientY - startClientY) / zoom
      const winWidth = containerRef.current ? containerRef.current.offsetWidth : 0
      const winHeight = containerRef.current ? containerRef.current.offsetHeight : 0
      const dw = window.innerWidth / zoom
      const dh = window.innerHeight / zoom
      setPosition({
        x: Math.max(0, Math.min(startPosX + deltaX, Math.max(0, dw - winWidth))),
        y: Math.max(0, Math.min(startPosY + deltaY, Math.max(0, dh - winHeight))),
      })
    }
    const onMouseUp = () => {
      isDragging.current = false
      setIsDraggingState(false)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>, direction: string) => {
    e.preventDefault()
    e.stopPropagation()
    isDragging.current = true
    setIsDraggingState(true)
    hasDragged.current = true

    const zoom = getZoom()
    const startClientX = e.clientX
    const startClientY = e.clientY
    const startWidth = containerRef.current!.offsetWidth
    const startHeight = containerRef.current!.offsetHeight
    const startX = position.x
    const startY = position.y

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return
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

      setSize({ width: newWidth, height: newHeight })
      if (newX !== startX || newY !== startY) {
        setPosition({ x: newX, y: newY })
      }
    }

    const onMouseUp = () => {
      isDragging.current = false
      setIsDraggingState(false)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return (
    <div
      className="nuxy-shell-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) window.core?.window?.esc?.()
      }}
    >
      <div
        ref={containerRef}
        className={themeStyles?.container ?? 'nuxy-shell-container'}
        style={{
          left: position.x,
          top: position.y,
          width: size.width
            ? `${size.width}px`
            : settings?.windowWidth
              ? `${settings.windowWidth}px`
              : undefined,
          height: size.height
            ? `${size.height}px`
            : activeTool
              ? `${settings?.windowMaxHeight ?? 600}px`
              : undefined,
          maxWidth: size.width
            ? 'none'
            : settings?.windowWidth
              ? `${settings.windowWidth}px`
              : undefined,
          maxHeight: size.height ? 'none' : `${settings?.windowMaxHeight ?? 600}px`,
          opacity: settings?.opacity !== undefined ? settings.opacity : undefined,
          transition:
            isDraggingState || isInitialLoad
              ? 'none'
              : 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1), top 0.3s cubic-bezier(0.16, 1, 0.3, 1), width 0.3s cubic-bezier(0.16, 1, 0.3, 1), height 0.3s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1), max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {(['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const).map((dir) => (
          <div
            key={dir}
            style={{
              position: 'absolute',
              zIndex: 9999,
              ...(dir === 'n' ? { top: 0, left: 0, right: 0, height: 6, cursor: 'ns-resize' } : {}),
              ...(dir === 's'
                ? { bottom: 0, left: 0, right: 0, height: 6, cursor: 'ns-resize' }
                : {}),
              ...(dir === 'e'
                ? { top: 0, bottom: 0, right: 0, width: 6, cursor: 'ew-resize' }
                : {}),
              ...(dir === 'w' ? { top: 0, bottom: 0, left: 0, width: 6, cursor: 'ew-resize' } : {}),
              ...(dir === 'ne'
                ? { top: 0, right: 0, width: 10, height: 10, cursor: 'nesw-resize' }
                : {}),
              ...(dir === 'nw'
                ? { top: 0, left: 0, width: 10, height: 10, cursor: 'nwse-resize' }
                : {}),
              ...(dir === 'se'
                ? { bottom: 0, right: 0, width: 10, height: 10, cursor: 'nwse-resize' }
                : {}),
              ...(dir === 'sw'
                ? { bottom: 0, left: 0, width: 10, height: 10, cursor: 'nesw-resize' }
                : {}),
            }}
            onMouseDown={(e) => handleResizeMouseDown(e, dir)}
          />
        ))}
        <div className="nuxy-main-wrapper">
          <div className="nuxy-shell-body">
            <div>
              <div
                ref={omniBarRef}
                className={`nuxy-shell-omni-bar ${showOmniBar ? '' : 'nuxy-shell-omni-bar--static'}`}
                onClick={() => showOmniBar && inputRef.current?.focus()}
                onMouseDown={handleDragMouseDown}
              >
                <span className="nuxy-shell-omni-bar__icon" aria-hidden="true">
                  {searchIcon ? (
                    <span
                      dangerouslySetInnerHTML={{ __html: searchIcon }}
                      style={{ display: 'flex', alignItems: 'center' }}
                    />
                  ) : (
                    <span className="nuxy-shell-omni-bar__icon-placeholder" aria-hidden="true" />
                  )}
                </span>
                <span className="nuxy-shell-omni-bar__sep">›</span>
                {activeToolName && (
                  <>
                    <span className="nuxy-shell-omni-bar__tool-name">{activeToolName}</span>
                    <span className="nuxy-shell-omni-bar__sep">›</span>
                  </>
                )}
                <input
                  autoFocus
                  ref={inputRef}
                  disabled={!showOmniBar}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setSavedQuery(e.target.value)
                    setSelectedIndex(-1)
                  }}
                  onKeyDown={handleKeyDown}
                  className="nuxy-shell-omni-bar__input"
                  aria-label="Search"
                  placeholder={
                    activeToolPlaceholder
                      ? activeToolPlaceholder
                      : activeToolName
                        ? `Search ${activeToolName}`
                        : 'What do you have in mind?'
                  }
                />
              </div>
            </div>

            {!activeTool && (
              <>
                {/* 1. Result Providers */}
                {Object.keys(providerStates)
                  .filter((id) => providerStates[id].type === 'result')
                  .map((id) => {
                    const state = providerStates[id]
                    if (state.loading)
                      return (
                        <div key={id} className="nuxy-provider-section">
                          <div className="nuxy-provider-section__header">
                            <span>{state.name}</span>
                            <div className="nuxy-provider-section__loading-dot" />
                          </div>
                          <div className="nuxy-skeleton-result nuxy-shimmer-bg" />
                        </div>
                      )
                    if (!state.items || state.items.length === 0) return null
                    return (
                      <div key={id} className="nuxy-provider-section">
                        <div className="nuxy-provider-section__header">
                          <span>{state.name}</span>
                        </div>
                        {state.items.map((item) => (
                          <ResultCard
                            key={item.id}
                            item={item}
                            providerName={state.name}
                            copiedId={copiedId}
                            onCopy={handleCopy}
                          />
                        ))}
                      </div>
                    )
                  })}

                {/* 2. Compare Providers */}
                {Object.keys(providerStates)
                  .filter((id) => providerStates[id].type === 'compare')
                  .map((id) => {
                    const state = providerStates[id]
                    if (state.loading)
                      return (
                        <div key={id} className="nuxy-provider-section">
                          <div className="nuxy-provider-section__header">
                            <span>{state.name}</span>
                            <div className="nuxy-provider-section__loading-dot" />
                          </div>
                          <div className="nuxy-skeleton-compare nuxy-shimmer-bg" />
                        </div>
                      )
                    if (!state.items || state.items.length === 0) return null
                    return (
                      <div key={id} className="nuxy-provider-section">
                        <div className="nuxy-provider-section__header">
                          <span>{state.name}</span>
                        </div>
                        {state.items.map((item) => (
                          <CompareCard
                            key={item.id}
                            item={item}
                            providerName={state.name}
                            copiedId={copiedId}
                            onCopy={handleCopy}
                          />
                        ))}
                      </div>
                    )
                  })}

                {/* 3. List Results */}
                {listResults.length > 0 && List ? (
                  <List role="listbox" aria-label="Results">
                    {listResults.map(
                      (item, index) =>
                        ListItem && (
                          <ListItem
                            key={item.id}
                            active={index === selectedIndex}
                            role="option"
                            aria-selected={index === selectedIndex}
                            onClick={() => handleItemClick(item)}
                          >
                            {ListItemBody && (
                              <ListItemBody>
                                {ListItemText && <ListItemText>{item.title}</ListItemText>}
                              </ListItemBody>
                            )}
                            {ListItemActions && item.subtitle && (
                              <ListItemActions>
                                <span className="nuxy-shell-results-item__subtitle">
                                  {item.subtitle}
                                </span>
                              </ListItemActions>
                            )}
                          </ListItem>
                        )
                    )}
                  </List>
                ) : (
                  listResults.length > 0 && (
                    <div className="nuxy-shell-results-list" role="listbox" aria-label="Results">
                      {listResults.map((item, index) => (
                        <div
                          key={item.id}
                          className={itemClass(index)}
                          role="option"
                          aria-selected={index === selectedIndex}
                          onClick={() => handleItemClick(item)}
                        >
                          <span className="nuxy-shell-results-item__title">{item.title}</span>
                          <span className="nuxy-shell-results-item__subtitle">{item.subtitle}</span>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* 4. List Provider Skeletons */}
                {isAnyListProviderLoading && (
                  <div className="nuxy-skeleton-list">
                    <div className="nuxy-skeleton-list-item nuxy-shimmer-bg" />
                    <div
                      className="nuxy-skeleton-list-item nuxy-shimmer-bg"
                      style={{ width: '80%' }}
                    />
                  </div>
                )}
              </>
            )}

            {ToolComponent && activeTool && (
              <React.Suspense
                fallback={
                  <div
                    className="nuxy-loading-state"
                    style={{
                      flex: 1,
                      minHeight: '200px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0.7,
                      fontSize: 'var(--font-sm)',
                    }}
                  >
                    Loading…
                  </div>
                }
              >
                <div className="nuxy-shell-tool-wrapper">
                  <ToolComponent query={query} extensionId={activeTool} />
                </div>
              </React.Suspense>
            )}
          </div>

          {ShortcutBar && (
            <ShortcutBar style={{ justifyContent: 'space-between' }}>
              <ShortcutHint>
                {footerHints || (activeTool && keyActionHints.length > 0) ? (
                  <>
                    {footerHints}
                    {activeTool &&
                      keyActionHints.map((a, i) => (
                        <React.Fragment key={a.key + (a.modifiers || []).join('')}>
                          {(i > 0 || footerHints) && ShortcutSep && <ShortcutSep />}
                          <span className="nuxy-shortcut-action" onClick={() => a.handler()}>
                            {Kbd &&
                              (Array.isArray(a.hint) ? (
                                a.hint.map((k, ki) => <Kbd key={ki}>{k}</Kbd>)
                              ) : (
                                <Kbd>{a.hint}</Kbd>
                              ))}
                            <span>{a.label}</span>
                          </span>
                        </React.Fragment>
                      ))}
                  </>
                ) : (
                  <span>{tools.length + 1} extensions loaded</span>
                )}
              </ShortcutHint>
              <ShortcutHint>
                {selectedIndex >= 0 && listResults.length > 0 && !activeTool ? (
                  <>
                    <span>Press</span>
                    <Kbd>Enter</Kbd>
                    <span>to run</span>
                  </>
                ) : toolActions.length > 0 ? (
                  <>
                    <Kbd>Ctrl</Kbd>
                    <Kbd>K</Kbd>
                    <span>to actions</span>
                  </>
                ) : null}
              </ShortcutHint>
            </ShortcutBar>
          )}
        </div>
      </div>

      {showCommandPalette && (
        <CommandPalette
          actions={toolActions}
          onClose={() => {
            setShowCommandPalette(false)
            setTimeout(() => inputRef.current?.focus(), 50)
          }}
          containerRef={containerRef}
          position={position}
        />
      )}
      {Toaster && <Toaster />}
    </div>
  )
}
