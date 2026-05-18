import React, { useState, useEffect, useRef } from 'react'
import { Card } from '@nuxy/ui'

export default function App() {
  const [query, setQuery] = useState('')
  const [savedQuery, setSavedQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [results, setResults] = useState<any[]>([])
  const [tools, setTools] = useState<any[]>([])
  const [providers, setProviders] = useState<any[]>([])
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [ToolComponent, setToolComponent] = useState<any>(null)
  const [themeStyles, setThemeStyles] = useState<any>(null)
  const [showOmniBar, setShowOmniBar] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const omniBarRef = useRef<HTMLDivElement>(null)
  const lastReportedSize = useRef({ width: 0, height: 0 })
  const isHoppidikActive = query.trim().toLowerCase() === 'hoppidiktest'

  useEffect(() => {
    if (!containerRef.current) return
    let rafId = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        if (!containerRef.current || !(window as any).core?.window?.resize) return
        const rect = containerRef.current.getBoundingClientRect()
        const width = Math.ceil(rect.width)
        const height = Math.ceil(rect.height)
        // Skip collapsed pre-layout measurements that caused 3px-wide snaps.
        if (width < 100 || height < 32) return
        const prev = lastReportedSize.current
        if (
          Math.abs(width - prev.width) < 2 &&
          Math.abs(height - prev.height) < 2
        ) {
          return
        }
        lastReportedSize.current = { width, height }
        ;(window as any).core.window.resize(width, height)
      })
    })
    observer.observe(containerRef.current)
    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [results, ToolComponent, activeTool])

  useEffect(() => {
    const handleOmniBarControl = (e: any) => {
      const { action } = e.detail
      if (action === 'hide') {
        setShowOmniBar(false)
      } else if (action === 'show') {
        setShowOmniBar(true)
        setTimeout(() => {
          inputRef.current?.focus()
        }, 50)
      }
    }
    window.addEventListener('omniBar-control' as any, handleOmniBarControl)
    return () => {
      window.removeEventListener('omniBar-control' as any, handleOmniBarControl)
    }
  }, [])

  useEffect(() => {
    const handleWindowShow = () => {
      console.log('[Renderer:App] Window opened/shown — resetting state and listing all tools.')
      setQuery('')
      setSavedQuery('')
      setActiveTool(null)
      setToolComponent(null)
      setSelectedIndex(-1)
      setShowOmniBar(true)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }

    const cleanup = (window as any).core?.window?.onShow?.(handleWindowShow)
    return () => {
      if (cleanup) cleanup()
    }
  }, [])

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
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
          ;(window as any).core?.window?.hide()
        }
        return
      }

      // If activeTool is active and the event didn't originate in an input field (e.g. omniBar is hidden)
      if (
        activeTool &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        )
      ) {
        const customEvent = new CustomEvent('omniBar-keydown', {
          detail: {
            key: e.key,
            code: e.code,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey
          }
        })
        window.dispatchEvent(customEvent)

        if (
          [
            'ArrowUp',
            'ArrowDown',
            'ArrowLeft',
            'ArrowRight',
            'Enter',
            'Space'
          ].includes(e.key)
        ) {
          e.preventDefault()
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [activeTool])

  // Fetch tools once on mount
  useEffect(() => {
    ;(window as any).core?.ipc
      ?.invoke('kernel', 'listTools', {})
      .then((res: any) => {
        if (res.success && res.data) {
          setTools(res.data)
        }
      })
      .catch((e: any) => console.error('Failed to list tools:', e))
  }, [])

  // Fetch providers once on mount
  useEffect(() => {
    ;(window as any).core?.ipc
      ?.invoke('kernel', 'listProviders', {})
      .then((res: any) => {
        if (res.success && res.data) {
          setProviders(res.data)
        }
      })
      .catch((e: any) => console.error('Failed to list providers:', e))
  }, [])

  // Fetch and apply theme once on mount
  useEffect(() => {
    ;(window as any).core?.ipc
      ?.invoke('kernel', 'getTheme', {})
      .then((res: any) => {
        if (res.success && res.data) {
          const themeData = res.data
          setThemeStyles(themeData.styles || null)

          if (themeData.colors) {
            const root = document.documentElement
            Object.entries(themeData.colors).forEach(([key, val]) => {
              root.style.setProperty(`--${key}`, val as string)
            })
          }
        }
      })
      .catch((e: any) => console.error('Failed to get theme:', e))
  }, [])

  useEffect(() => {
    if (isHoppidikActive) {
      console.log('[Renderer:App] Hoppidik activated!')
      ;(window as any).core?.window?.startHoppidik?.()
    } else {
      ;(window as any).core?.window?.stopHoppidik?.()
    }
    return () => {
      ;(window as any).core?.window?.stopHoppidik?.()
    }
  }, [isHoppidikActive])

  // Calculate matching tools and provider results when savedQuery changes
  useEffect(() => {
    if (activeTool) {
      setResults([])
      return
    }

    const fetchResults = async () => {
      if (savedQuery.trim().toLowerCase() === 'hoppidiktest') {
        setResults([
          {
            id: 'hoppidik',
            title: '🐰 Hoppidik Modu Aktif!',
            subtitle: 'Boing! Boing! 🚀',
            isHoppidik: true
          }
        ])
        return
      }

      // 1. Convert registered tools to results format
      const toolItems = tools.map((t: any) => ({
        id: t.id,
        title: t.manifest.name,
        subtitle: t.manifest.id || 'Tool',
        isTool: true,
        value: t.manifest.name
      }))

      // 2. Filter tools based on savedQuery
      let filteredTools = toolItems
      if (savedQuery.trim().length > 0) {
        filteredTools = toolItems.filter(
          (item: any) =>
            item.title.toLowerCase().includes(savedQuery.toLowerCase()) ||
            item.id.toLowerCase().includes(savedQuery.toLowerCase())
        )
      }

      // 3. Fetch all provider results
      let providerResults: any[] = []
      if (savedQuery.trim().length > 0 && providers.length > 0) {
        try {
          const promises = providers.map(async (provider) => {
            try {
              const res = await (window as any).core.ipc.invoke(
                provider.id,
                'eval',
                { text: savedQuery }
              )
              if (res.success && res.data && res.data.items) {
                return res.data.items
              }
            } catch (e) {
              console.error(`IPC invocation failed for provider ${provider.id}:`, e)
            }
            return []
          })
          const resultsArray = await Promise.all(promises)
          providerResults = resultsArray.flat()
        } catch (e) {
          console.error('Failed to fetch provider results:', e)
        }
      }

      const combined = [...filteredTools, ...providerResults]
      setResults(combined)
    }

    const timeoutId = setTimeout(fetchResults, 50)
    return () => clearTimeout(timeoutId)
  }, [savedQuery, tools, activeTool, providers])

  // Synchronize input value with selection changes
  useEffect(() => {
    if (activeTool) return
    if (selectedIndex === -1 || selectedIndex === 0) {
      setQuery(savedQuery)
    } else if (selectedIndex > 0 && results[selectedIndex]) {
      setQuery(results[selectedIndex].title)
    }
  }, [selectedIndex, savedQuery, results, activeTool])

  const openTool = (toolId: string) => {
    console.log(`[Renderer:App] Opening tool: ${toolId}`)
    setActiveTool(toolId)
    setResults([])
    setQuery('') // Clear the query so the active tool can receive the query typed in the main input
    setSavedQuery('')
    const dynamicImport = new Function('url', 'return import(url)')
    dynamicImport(`nuxy-ext://${toolId}/frontend.js`)
      .then((module: any) => {
        setToolComponent(() => module.default)
      })
      .catch(console.error)
  }

  const handleItemClick = (item: any) => {
    if (item.isTool) {
      openTool(item.id)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (activeTool && query === '' && e.key === 'Backspace') {
      e.preventDefault()
      setActiveTool(null)
      setToolComponent(null)
      setQuery('')
      setSavedQuery('')
      return
    }

    if (activeTool) {
      // Forward key down events to the active tool via a custom event
      const customEvent = new CustomEvent('omniBar-keydown', {
        detail: {
          key: e.key,
          code: e.code,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey
        }
      })
      window.dispatchEvent(customEvent)

      // Prevent cursor jump for vertical navigation
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
      }
      // Prevent cursor jump for horizontal navigation if search field is empty
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && query === '') {
        e.preventDefault()
      }
      return
    }

    if (results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => {
        const nextIndex = prev + 1
        return nextIndex < results.length ? nextIndex : prev
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => {
        const nextIndex = prev - 1
        return nextIndex >= -1 ? nextIndex : prev
      })
    } else if (e.key === 'ArrowRight') {
      if (selectedIndex === 0 && results[0]) {
        e.preventDefault()
        const itemTitle = results[0].title
        setSavedQuery(itemTitle)
        setQuery(itemTitle)
        setSelectedIndex(-1)
      }
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && results[selectedIndex]) {
        e.preventDefault()
        handleItemClick(results[selectedIndex])
      }
    }
  }

  const handleDragMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLInputElement) return
    e.preventDefault()
    ;(window as any).core?.window?.dragStart?.()
    const onMouseMove = () => (window as any).core?.window?.dragMove?.()
    const onMouseUp = () => {
      ;(window as any).core?.window?.dragEnd?.()
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const activeToolName = activeTool
    ? tools.find((t) => t.id === activeTool)?.manifest.name || activeTool
    : null

  return (
    <div
      ref={containerRef}
      className={
        isHoppidikActive
          ? 'w-full h-full bg-bg-base border border-syntax-comment rounded-xl shadow-2xl overflow-hidden'
          : themeStyles?.container ||
            'w-full h-fit bg-bg-base border border-syntax-comment rounded-xl shadow-2xl overflow-hidden'
      }
      style={{
        height: isHoppidikActive ? '100vh' : undefined
      }}
    >
      <div className="w-full text-syntax-variable">
        {/* Breadcrumb omniBar */}
        <div
          className="omniBar-wrapper"
          style={{
            overflow: 'hidden',
            maxHeight: showOmniBar ? '200px' : '0px',
            transition: 'max-height 0.2s ease'
          }}
        >
          <div
            ref={omniBarRef}
            style={{
              transform: showOmniBar ? 'translateY(0)' : 'translateY(-100%)',
              transition: 'transform 0.2s ease',
              cursor: 'grab'
            }}
            className="omniBar-bar"
            onClick={() => inputRef.current?.focus()}
            onMouseDown={handleDragMouseDown}
          >
            {/* Hidden real input */}
            <input
              autoFocus
              ref={inputRef}
              disabled={!showOmniBar}
              value={query}
              onChange={(e: any) => {
                const val = e.target.value
                setQuery(val)
                setSavedQuery(val)
                setSelectedIndex(-1)
              }}
              onKeyDown={handleKeyDown}
              className="omniBar-hidden-input"
              aria-label="Search"
            />

            {/* Icon */}
            <span className="omniBar-icon">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>

            {/* Separator */}
            <span className="omniBar-sep">›</span>

            {/* Tool name segment (only when a tool is active) */}
            {activeToolName && (
              <>
                <span className="omniBar-segment omniBar-segment--tool">
                  {activeToolName}
                </span>
                <span className="omniBar-sep">›</span>
              </>
            )}

            {/* Query / placeholder segment */}
            <span className="omniBar-segment omniBar-segment--query">
              {query ? (
                <span className="omniBar-typed">
                  {query}
                  <span className="omniBar-cursor" />
                </span>
              ) : (
                <span className="omniBar-placeholder">
                  <span className="omniBar-cursor" />
                  {activeToolName
                    ? `Search ${activeToolName}`
                    : 'What do you have in mind?'}
                </span>
              )}
            </span>
          </div>
        </div>
        {/* end omniBar-wrapper */}

        {results.length > 0 && !activeTool && (
          <div
            className={
              isHoppidikActive
                ? 'mt-0 border-t border-syntax-comment flex flex-col gap-0 items-center justify-center overflow-hidden'
                : 'mt-0 border-t border-syntax-comment flex flex-col gap-0 max-h-[350px] overflow-y-auto custom-scrollbar'
            }
            style={isHoppidikActive ? { height: 'calc(100vh - 52px)' } : undefined}
          >
            {isHoppidikActive ? (
              <div className="flex flex-col items-center justify-center p-8 text-center select-none animate-bounce">
                <span style={{ fontSize: '72px' }}>🐰</span>
                <h1 className="text-3xl font-extrabold text-syntax-function mt-4 tracking-wider">
                  HOPPİDİK!
                </h1>
                <p className="text-syntax-peach mt-2 font-mono text-sm animate-pulse">
                  Bouncing around the screen... 🚀
                </p>
              </div>
            ) : (
              results.map((item, index) => (
                <div
                  key={item.id}
                  className={
                    index === selectedIndex
                      ? themeStyles?.itemActive ||
                        'px-4 py-3 flex items-center justify-between cursor-pointer transition-all duration-150 bg-syntax-comment border-l-2 border-syntax-operator'
                      : themeStyles?.itemInactive ||
                        'px-4 py-3 flex items-center justify-between cursor-pointer transition-all duration-150 border-l-2 border-transparent hover:bg-syntax-comment hover:border-syntax-comment'
                  }
                  onClick={() => handleItemClick(item)}
                >
                  <span
                    className={
                      index === selectedIndex
                        ? themeStyles?.itemTitleActive ||
                          'text-base font-medium transition-colors duration-150 text-syntax-function'
                        : themeStyles?.itemTitleInactive ||
                          'text-base font-medium transition-colors duration-150 text-syntax-variable'
                    }
                  >
                    {item.title}
                  </span>
                  <span
                    className={
                      index === selectedIndex
                        ? themeStyles?.itemSubtitleActive ||
                          'text-xs font-mono px-2 py-0.5 rounded transition-colors duration-150 text-syntax-constant bg-bg-base border border-syntax-operator'
                        : themeStyles?.itemSubtitleInactive ||
                          'text-xs font-mono px-2 py-0.5 rounded transition-colors duration-150 text-syntax-peach bg-syntax-comment border border-transparent'
                    }
                  >
                    {item.subtitle}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {ToolComponent && activeTool && (
          <React.Suspense
            fallback={
              <div className="text-syntax-variable px-4 py-3 animate-pulse text-sm">
                Loading Module...
              </div>
            }
          >
            <div className="border-t border-syntax-comment">
              <ToolComponent query={query} />
            </div>
          </React.Suspense>
        )}
      </div>
    </div>
  )
}
