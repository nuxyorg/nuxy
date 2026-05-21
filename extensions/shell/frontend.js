const React = window.React
const { useState, useEffect, useRef, useLayoutEffect } = React

const SHELL_EXT_ID = 'com.nuxy.shell'
const SHELL_CSS_ID = 'nuxy-shell-styles'

function parseCoordinate(val, displayLength, winLength) {
  if (!val) return Math.round((displayLength - winLength) / 2)
  val = val.trim().toLowerCase()
  if (val === 'center') return Math.round((displayLength - winLength) / 2)
  if (val.endsWith('px')) {
    const px = parseFloat(val)
    return isNaN(px) ? Math.round((displayLength - winLength) / 2) : Math.round(px)
  }
  if (val.endsWith('%')) {
    const pct = parseFloat(val)
    if (!isNaN(pct)) return Math.round(displayLength * (pct / 100) - winLength / 2)
  }
  if (val.includes('/')) {
    const parts = val.split('/')
    if (parts.length === 2) {
      const num = parseFloat(parts[0])
      const den = parseFloat(parts[1])
      if (!isNaN(num) && !isNaN(den) && den !== 0) {
        return Math.round(displayLength * (num / den) - winLength / 2)
      }
    }
  }
  const ratio = parseFloat(val)
  if (!isNaN(ratio)) {
    if (ratio >= 0 && ratio <= 1) return Math.round(displayLength * ratio - winLength / 2)
    return Math.round(ratio)
  }
  return Math.round((displayLength - winLength) / 2)
}

function ensureShellStyles() {
  if (document.getElementById(SHELL_CSS_ID)) return
  const link = document.createElement('link')
  link.id = SHELL_CSS_ID
  link.rel = 'stylesheet'
  link.href = `nuxy-ext://${SHELL_EXT_ID}/shell.css`
  document.head.appendChild(link)
}

ensureShellStyles()

function CommandPalette({ actions, onClose, containerRef, position }) {
  const { useState, useEffect, useRef, useLayoutEffect } = React
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [style, setStyle] = useState({})
  const inputRef = useRef(null)

  const filteredActions = actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))

  useLayoutEffect(() => {
    if (containerRef?.current && position) {
      const getZoom = () => {
        const z = document.documentElement.style.zoom
        if (!z) return 1
        if (z.endsWith('%')) return parseFloat(z) / 100
        return parseFloat(z) || 1
      }
      const zoom = getZoom()
      const cssWindowHeight = window.innerHeight / zoom

      const winWidth = containerRef.current.offsetWidth
      const winHeight = containerRef.current.offsetHeight

      let top = position.y + winHeight + 12
      if (top + 350 > cssWindowHeight) {
        if (position.y - 362 > 0) {
          top = position.y - 362
        } else {
          top = Math.max(12, cssWindowHeight - 362)
        }
      }

      let left = position.x + winWidth - 350
      if (left < 12) left = 12

      setStyle({
        position: 'absolute',
        top: top,
        left: left,
        width: 350,
        margin: 0,
      })
    }
  }, [containerRef, position])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, Math.max(0, filteredActions.length - 1)))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const action = filteredActions[selectedIndex]
        if (action && action.onExecute) {
          action.onExecute()
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filteredActions, selectedIndex, onClose])

  return (
    <div
      className="nuxy-command-palette-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="nuxy-command-palette" style={style}>
        <div className="nuxy-command-palette__input-wrapper">
          <input
            ref={inputRef}
            autoFocus
            className="nuxy-command-palette__input"
            placeholder="Search commands..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="nuxy-command-palette__list">
          {filteredActions.length === 0 ? (
            <div style={{ padding: '12px 16px', color: 'var(--syntax-comment)' }}>
              No actions available.
            </div>
          ) : (
            filteredActions.map((action, idx) => (
              <div
                key={action.id}
                className={`nuxy-command-palette__item ${idx === selectedIndex ? 'nuxy-command-palette__item--active' : ''}`}
                onClick={() => {
                  if (action.onExecute) action.onExecute()
                  onClose()
                }}
              >
                <span>{action.label}</span>
                <span className="nuxy-command-palette__shortcut">Enter</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function ShellView({ query: _queryProp }) {
  const { ShortcutBar, ShortcutHint, Kbd } = window.ui || {}
  const [query, setQuery] = useState('')
  const [savedQuery, setSavedQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [results, setResults] = useState([])
  const [tools, setTools] = useState([])
  const [providers, setProviders] = useState([])
  const [orchestrators, setOrchestrators] = useState([])
  const [activeTool, setActiveTool] = useState(null)
  const [ToolComponent, setToolComponent] = useState(null)
  const [showOmniBar, setShowOmniBar] = useState(true)
  const [themeStyles, setThemeStyles] = useState(null)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [toolActions, setToolActions] = useState([])
  const [position, setPosition] = useState({
    x: Math.round((window.innerWidth - 800) / 2),
    y: Math.round(window.innerHeight * 0.15),
  })
  const [settings, setSettings] = useState(null)
  const cfgRef = useRef(null)
  const hasDragged = useRef(false)
  const isDragging = useRef(false)
  const dragStartPos = useRef({ x: 0, y: 0 })
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const omniBarRef = useRef(null)
  const lastReportedSize = useRef({ width: 0, height: 0 })
  const queryGeneration = useRef(0)

  useLayoutEffect(() => {
    if (!containerRef.current) return
    const getZoom = () => {
      const z = document.documentElement.style.zoom
      if (!z) return 1
      if (z.endsWith('%')) return parseFloat(z) / 100
      return parseFloat(z) || 1
    }
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
  }, [position.x, position.y, results, activeTool])

  useEffect(() => {
    let lastZoom = document.documentElement.style.zoom || '100%'

    const getZoom = () => {
      const z = document.documentElement.style.zoom
      if (!z) return 1
      if (z.endsWith('%')) return parseFloat(z) / 100
      return parseFloat(z) || 1
    }

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

      let targetX = parseCoordinate(parts[0], dw, winWidth)
      let targetY = parseCoordinate(parts.length >= 2 ? parts[1] : '', dh, winHeight)

      setPosition({ x: targetX, y: targetY })
    }

    const observer = new MutationObserver((mutations) => {
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
      setActiveTool(null)
      setToolComponent(null)
      setSelectedIndex(-1)
      setShowOmniBar(true)
      setShowCommandPalette(false)
      hasDragged.current = false
      updatePosition(true)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
    const onFocus = () => inputRef.current?.focus()

    const handleSettingsUpdate = (e) => {
      console.log('[Shell] received nuxy-settings-updated', e.detail)
      if (e.detail) {
        setSettings(e.detail)
        if (cfgRef.current) {
          cfgRef.current = { ...cfgRef.current, ...e.detail }
        }
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
    const handleActions = (e) => setToolActions(e.detail || [])
    window.addEventListener('nuxy-register-actions', handleActions)
    return () => window.removeEventListener('nuxy-register-actions', handleActions)
  }, [])

  useEffect(() => {
    setToolActions([])
  }, [activeTool])

  useEffect(() => {
    const handleOmniBarControl = (e) => {
      const { action } = e.detail
      if (action === 'hide') {
        setShowOmniBar(false)
        inputRef.current?.blur()
      } else if (action === 'show') {
        setShowOmniBar(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    }
    window.addEventListener('nuxy-shell-omni-bar-control', handleOmniBarControl)
    return () => window.removeEventListener('nuxy-shell-omni-bar-control', handleOmniBarControl)
  }, [])

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowCommandPalette((prev) => !prev)
        return
      }

      if (e.key === 'Escape') {
        if (showCommandPalette) {
          setShowCommandPalette(false)
          setTimeout(() => inputRef.current?.focus(), 50)
          return
        }
        if (activeTool) {
          setActiveTool(null)
          setToolComponent(null)
          setQuery('')
          setSavedQuery('')
          setSelectedIndex(-1)
          setShowOmniBar(true)
        } else {
          setQuery('')
          setSavedQuery('')
          setSelectedIndex(-1)
          window.core?.window?.esc?.()
        }
        return
      }

      if (showCommandPalette) return

      if (
        activeTool &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
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
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Space'].includes(e.key)) {
          e.preventDefault()
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [activeTool, showCommandPalette])

  useEffect(() => {
    window.core?.ipc?.invoke('kernel', 'getConfig', {}).then((res) => {
      if (res.success && res.data) {
        cfgRef.current = res.data
        window.dispatchEvent(new Event('resize'))
      }
    })

    window.core?.ipc?.invoke('kernel', 'listTools', {}).then((res) => {
      if (res.success && res.data) setTools(res.data.filter((t) => t.id !== SHELL_EXT_ID))
    })
    window.core?.ipc?.invoke('kernel', 'listProviders', {}).then((res) => {
      if (res.success && res.data) setProviders(res.data)
    })
    window.core?.ipc?.invoke('kernel', 'listOrchestrators', {}).then((res) => {
      if (res.success && res.data) setOrchestrators(res.data)
    })
    window.core?.ipc?.invoke('kernel', 'getTheme', {}).then((res) => {
      if (res.success && res.data?.styles) setThemeStyles(res.data.styles)
      if (res.success && res.data?.colors) {
        const root = document.documentElement
        Object.entries(res.data.colors).forEach(([key, val]) => {
          root.style.setProperty(`--${key}`, val)
        })
      }
    })

    const FONT_FAMILY_MAP = {
      system: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
      monospace: 'monospace',
      'JetBrains Mono': `'JetBrains Mono', 'JetBrainsMono Nerd Font', monospace`,
      'Fira Code': `'Fira Code', 'FiraCode Nerd Font', monospace`,
      'Cascadia Code': `'Cascadia Code', monospace`,
    }

    window.core?.ipc
      ?.invoke('com.nuxy.settings', 'getSettings', {})
      .then((res) => {
        if (!res?.success || !res.data) return
        const s = res.data
        setSettings(s)
        if (s.zoom) document.documentElement.style.zoom = s.zoom
        if (s.font) document.body.style.fontFamily = FONT_FAMILY_MAP[s.font] || s.font
        if (s.theme) {
          window.core.ipc
            .invoke('kernel', 'getThemeByName', { name: s.theme })
            .then((themeRes) => {
              if (!themeRes?.success || !themeRes.data) return
              const { colors, tokens } = themeRes.data
              const root = document.documentElement
              if (colors)
                Object.entries(colors).forEach(([k, v]) => root.style.setProperty(`--${k}`, v))
              if (tokens)
                Object.entries(tokens).forEach(([k, v]) => root.style.setProperty(`--${k}`, v))
            })
            .catch(console.error)
        }
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (activeTool) {
      setResults([])
      return
    }

    const generation = ++queryGeneration.current

    const fetchResults = async () => {
      if (window.__NUXY_DEV__ && savedQuery.trim().toLowerCase() === 'hoppidiktest') {
        setResults([
          {
            id: 'hoppidik',
            title: '🐰 Hoppidik Modu Aktif!',
            subtitle: 'Boing! Boing! 🚀',
          },
        ])
        return
      }

      const toolItems = tools.map((t) => ({
        id: t.id,
        title: t.manifest.name,
        subtitle: t.manifest.id || 'Tool',
        isTool: true,
        value: t.manifest.name,
      }))

      let filteredTools = toolItems
      if (savedQuery.trim().length > 0) {
        filteredTools = toolItems.filter(
          (item) =>
            item.title.toLowerCase().includes(savedQuery.toLowerCase()) ||
            item.id.toLowerCase().includes(savedQuery.toLowerCase())
        )
      }

      let providerResults = []
      if (savedQuery.trim().length > 0 && providers.length > 0) {
        const promises = providers.map(async (provider) => {
          try {
            const res = await window.core.ipc.invoke(provider.id, 'eval', {
              text: savedQuery,
            })
            if (generation !== queryGeneration.current) return []
            if (res.success && res.data?.items) return res.data.items
          } catch (e) {
            console.error(`Provider ${provider.id} failed:`, e)
          }
          return []
        })
        providerResults = (await Promise.all(promises)).flat()
      }

      if (generation !== queryGeneration.current) return
      setResults([...filteredTools, ...providerResults])
    }

    const timeoutId = setTimeout(fetchResults, 50)
    return () => clearTimeout(timeoutId)
  }, [savedQuery, tools, activeTool, providers])

  useEffect(() => {
    if (activeTool) return
    if (selectedIndex === -1 || selectedIndex === 0) {
      setQuery(savedQuery)
    } else if (selectedIndex > 0 && results[selectedIndex]) {
      setQuery(results[selectedIndex].title)
    }
  }, [selectedIndex, savedQuery, results, activeTool])

  const openTool = (toolId) => {
    setActiveTool(toolId)
    setResults([])
    setQuery('')
    setSavedQuery('')
    const dynamicImport = new Function('url', 'return import(url)')
    dynamicImport(`nuxy-ext://${toolId}/frontend.js`)
      .then((module) => setToolComponent(() => module.default))
      .catch(console.error)
  }

  const handleItemClick = (item) => {
    if (item.isTool) openTool(item.id)
  }

  const tryOrchestratorRoute = async () => {
    if (!savedQuery.trim() || orchestrators.length === 0) return
    const orch = orchestrators[0]
    try {
      await window.core.ipc.invoke(orch.id, 'route', { text: savedQuery })
    } catch (e) {
      console.error('Orchestrator route failed:', e)
    }
  }

  const handleKeyDown = (e) => {
    if (activeTool && query === '' && e.key === 'Backspace') {
      e.preventDefault()
      setActiveTool(null)
      setToolComponent(null)
      setQuery('')
      setSavedQuery('')
      return
    }

    if (activeTool) {
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
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault()
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && query === '') {
        e.preventDefault()
      }
      return
    }

    if (e.key === 'Enter' && selectedIndex < 0 && savedQuery.trim()) {
      void tryOrchestratorRoute()
    }

    if (results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => {
        const next = prev + 1
        return next < results.length ? next : prev
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => {
        const next = prev - 1
        return next >= -1 ? next : prev
      })
    } else if (e.key === 'ArrowRight') {
      if (selectedIndex === 0 && results[0]) {
        e.preventDefault()
        setSavedQuery(results[0].title)
        setQuery(results[0].title)
        setSelectedIndex(-1)
      }
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && results[selectedIndex]) {
        e.preventDefault()
        handleItemClick(results[selectedIndex])
      }
    }
  }

  const activeToolName = activeTool
    ? tools.find((t) => t.id === activeTool)?.manifest.name || activeTool
    : null

  const itemClass = (index) =>
    index === selectedIndex
      ? (themeStyles?.itemActive ?? 'nuxy-shell-results-item nuxy-shell-results-item--active')
      : (themeStyles?.itemInactive ?? 'nuxy-shell-results-item')

  const handleDragMouseDown = (e) => {
    if (e.target instanceof HTMLInputElement) return
    if (e.button !== 0) return // Only allow left click drag
    e.preventDefault()
    isDragging.current = true
    hasDragged.current = true

    let zoom = 1
    const zoomStyle = document.documentElement.style.zoom
    if (zoomStyle) {
      if (zoomStyle.endsWith('%')) {
        zoom = parseFloat(zoomStyle) / 100
      } else {
        zoom = parseFloat(zoomStyle)
      }
    }
    if (isNaN(zoom) || zoom <= 0) zoom = 1

    const startClientX = e.clientX
    const startClientY = e.clientY
    const startPosX = position.x
    const startPosY = position.y

    const onMouseMove = (moveEvent) => {
      if (!isDragging.current) return

      const deltaX = (moveEvent.clientX - startClientX) / zoom
      const deltaY = (moveEvent.clientY - startClientY) / zoom

      const winWidth = containerRef.current ? containerRef.current.offsetWidth : 0
      const winHeight = containerRef.current ? containerRef.current.offsetHeight : 0
      const dw = window.innerWidth / zoom
      const dh = window.innerHeight / zoom

      let targetX = startPosX + deltaX
      let targetY = startPosY + deltaY

      targetX = Math.max(0, Math.min(targetX, Math.max(0, dw - winWidth)))
      targetY = Math.max(0, Math.min(targetY, Math.max(0, dh - winHeight)))

      setPosition({
        x: targetX,
        y: targetY,
      })
    }
    const onMouseUp = () => {
      isDragging.current = false
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
        if (e.target === e.currentTarget) {
          window.core?.window?.esc?.()
        }
      }}
    >
      <div
        ref={containerRef}
        className={themeStyles?.container ?? 'nuxy-shell-container'}
        style={{
          left: position.x,
          top: position.y,
          maxWidth: settings?.windowWidth ? `${settings.windowWidth}px` : undefined,
          maxHeight: settings?.windowMaxHeight ? `${settings.windowMaxHeight}px` : undefined,
          opacity: settings?.opacity !== undefined ? settings.opacity : undefined,
        }}
      >
        <div className="nuxy-shell-body">
          <div>
            <div
              ref={omniBarRef}
              className={`nuxy-shell-omni-bar ${showOmniBar ? '' : 'nuxy-shell-omni-bar--static'}`}
              onClick={() => showOmniBar && inputRef.current?.focus()}
              onMouseDown={handleDragMouseDown}
            >
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
                className="nuxy-shell-omni-bar__hidden-input"
                aria-label="Search"
              />
              <span className="nuxy-shell-omni-bar__icon" aria-hidden="true">
                🔍
              </span>
              <span className="nuxy-shell-omni-bar__sep">›</span>
              {activeToolName && (
                <>
                  <span className="nuxy-shell-omni-bar__tool-name">{activeToolName}</span>
                  <span className="nuxy-shell-omni-bar__sep">›</span>
                </>
              )}
              <span className="nuxy-shell-omni-bar__query-area">
                {query ? (
                  <span className="nuxy-shell-omni-bar__typed">
                    {query}
                    {showOmniBar && <span className="nuxy-shell-omni-bar__cursor" />}
                  </span>
                ) : (
                  <span className="nuxy-shell-omni-bar__placeholder">
                    {showOmniBar && <span className="nuxy-shell-omni-bar__cursor" />}
                    {activeToolName ? `Search ${activeToolName}` : 'What do you have in mind?'}
                  </span>
                )}
              </span>
            </div>
          </div>

          {results.length > 0 && !activeTool && (
            <div className="nuxy-shell-results-list" role="listbox" aria-label="Results">
              {results.map((item, index) => (
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
          )}

          {ToolComponent && activeTool && (
            <React.Suspense fallback={<div className="nuxy-shell-tool-loading">Loading…</div>}>
              <div className="nuxy-shell-tool-wrapper">
                <ToolComponent query={query} />
              </div>
            </React.Suspense>
          )}
        </div>
        {ShortcutBar && (
          <ShortcutBar style={{ justifyContent: 'space-between' }}>
            <ShortcutHint>
              <span>{tools.length + 1} extensions loaded</span>
            </ShortcutHint>
            <ShortcutHint>
              {selectedIndex >= 0 && results.length > 0 && !activeTool ? (
                <>
                  <span>Press</span>
                  <Kbd>Enter</Kbd>
                  <span>to run</span>
                </>
              ) : (
                <>
                  <Kbd>Ctrl</Kbd>
                  <Kbd>K</Kbd>
                  <span>to actions</span>
                </>
              )}
            </ShortcutHint>
          </ShortcutBar>
        )}
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
    </div>
  )
}
