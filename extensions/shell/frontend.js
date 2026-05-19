const React = window.React
const { useState, useEffect, useRef } = React

const SHELL_EXT_ID = 'com.nuxy.shell'
const SHELL_CSS_ID = 'nuxy-shell-styles'

function ensureShellStyles() {
  if (document.getElementById(SHELL_CSS_ID)) return
  const link = document.createElement('link')
  link.id = SHELL_CSS_ID
  link.rel = 'stylesheet'
  link.href = `nuxy-ext://${SHELL_EXT_ID}/shell.css`
  document.head.appendChild(link)
}

ensureShellStyles()

export default function ShellView({ query: _queryProp }) {
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
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const omniBarRef = useRef(null)
  const lastReportedSize = useRef({ width: 0, height: 0 })
  const queryGeneration = useRef(0)

  useEffect(() => {
    const onReset = () => {
      setQuery('')
      setSavedQuery('')
      setActiveTool(null)
      setToolComponent(null)
      setSelectedIndex(-1)
      setShowOmniBar(true)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
    window.addEventListener('nuxy-shell-reset', onReset)
    return () => window.removeEventListener('nuxy-shell-reset', onReset)
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    let rafId = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        if (!containerRef.current || !window.core?.window?.resize) return
        const rect = containerRef.current.getBoundingClientRect()
        const width = Math.ceil(rect.width)
        const height = Math.ceil(rect.height)
        if (width < 100 || height < 32) return
        const prev = lastReportedSize.current
        if (
          Math.abs(width - prev.width) < 2 &&
          Math.abs(height - prev.height) < 2
        ) {
          return
        }
        lastReportedSize.current = { width, height }
        window.core.window.resize(width, height)
      })
    })
    observer.observe(containerRef.current)
    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [results, ToolComponent, activeTool])

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
    window.addEventListener('omniBar-control', handleOmniBarControl)
    return () => window.removeEventListener('omniBar-control', handleOmniBarControl)
  }, [])

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape') {
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
          setResults([])
          setSelectedIndex(-1)
          window.core?.window?.esc?.()
        }
        return
      }

      if (
        activeTool &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        window.dispatchEvent(
          new CustomEvent('omniBar-keydown', {
            detail: {
              key: e.key,
              code: e.code,
              shiftKey: e.shiftKey,
              altKey: e.altKey,
              ctrlKey: e.ctrlKey,
              metaKey: e.metaKey
            }
          })
        )
        if (
          ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Space'].includes(
            e.key
          )
        ) {
          e.preventDefault()
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [activeTool])

  useEffect(() => {
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
  }, [])

  useEffect(() => {
    if (activeTool) {
      setResults([])
      return
    }

    const generation = ++queryGeneration.current

    const fetchResults = async () => {
      if (
        window.__NUXY_DEV__ &&
        savedQuery.trim().toLowerCase() === 'hoppidiktest'
      ) {
        setResults([
          {
            id: 'hoppidik',
            title: '🐰 Hoppidik Modu Aktif!',
            subtitle: 'Boing! Boing! 🚀'
          }
        ])
        return
      }

      const toolItems = tools.map((t) => ({
        id: t.id,
        title: t.manifest.name,
        subtitle: t.manifest.id || 'Tool',
        isTool: true,
        value: t.manifest.name
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
              text: savedQuery
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
        new CustomEvent('omniBar-keydown', {
          detail: {
            key: e.key,
            code: e.code,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey
          }
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

  const handleDragMouseDown = (e) => {
    if (e.target instanceof HTMLInputElement) return
    e.preventDefault()
    window.core?.window?.dragStart?.()
    const onMouseMove = () => window.core?.window?.dragMove?.()
    const onMouseUp = () => {
      window.core?.window?.dragEnd?.()
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const activeToolName = activeTool
    ? tools.find((t) => t.id === activeTool)?.manifest.name || activeTool
    : null

  const itemClass = (index) =>
    index === selectedIndex
      ? themeStyles?.itemActive ?? 'results-item results-item--active'
      : themeStyles?.itemInactive ?? 'results-item'

  return (
    <div ref={containerRef} className={themeStyles?.container ?? 'app-container'}>
      <div className="app-body">
        <div>
          <div
            ref={omniBarRef}
            className={`omni-bar ${showOmniBar ? '' : 'omni-bar--static'}`}
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
              className="omni-bar__hidden-input"
              aria-label="Search"
            />
            <span className="omni-bar__icon">🔍</span>
            <span className="omni-bar__sep">›</span>
            {activeToolName && (
              <>
                <span className="omni-bar__tool-name">{activeToolName}</span>
                <span className="omni-bar__sep">›</span>
              </>
            )}
            <span className="omni-bar__query-area">
              {query ? (
                <span className="omni-bar__typed">
                  {query}
                  {showOmniBar && <span className="omni-bar__cursor" />}
                </span>
              ) : (
                <span className="omni-bar__placeholder">
                  {showOmniBar && <span className="omni-bar__cursor" />}
                  {activeToolName
                    ? `Search ${activeToolName}`
                    : 'What do you have in mind?'}
                </span>
              )}
            </span>
          </div>
        </div>

        {results.length > 0 && !activeTool && (
          <div className="results-list">
            {results.map((item, index) => (
              <div
                key={item.id}
                className={itemClass(index)}
                onClick={() => handleItemClick(item)}
              >
                <span className="results-item__title">{item.title}</span>
                <span className="results-item__subtitle">{item.subtitle}</span>
              </div>
            ))}
          </div>
        )}

        {ToolComponent && activeTool && (
          <React.Suspense
            fallback={<div className="tool-loading">Loading…</div>}
          >
            <div className="tool-wrapper">
              <ToolComponent query={query} />
            </div>
          </React.Suspense>
        )}
      </div>
    </div>
  )
}
