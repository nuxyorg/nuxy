import React, { useState, useEffect, useRef } from 'react'
import { Card } from '@nuxy/ui'
import type { LoadedExtension, ThemeDefinition, IpcResult } from '@nuxy/core'

interface SearchResult {
  id: string
  title: string
  subtitle?: string
  value?: string
  isTool?: boolean
}

export default function App() {
  const [query, setQuery] = useState('')
  const [savedQuery, setSavedQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [results, setResults] = useState<SearchResult[]>([])
  const [tools, setTools] = useState<LoadedExtension[]>([])
  const [providers, setProviders] = useState<LoadedExtension[]>([])
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [ToolComponent, setToolComponent] = useState<React.ComponentType<{
    query: string
  }> | null>(null)
  const [themeStyles, setThemeStyles] = useState<
    ThemeDefinition['styles'] | null
  >(null)
  const [showOmniBar, setShowOmniBar] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const omniBarRef = useRef<HTMLDivElement>(null)
  const lastReportedSize = useRef({ width: 0, height: 0 })

  useEffect(() => {
    if (!containerRef.current) return
    let rafId = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        if (!containerRef.current || !(window as any).core?.window?.resize)
          return
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
        inputRef.current?.blur()
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
      console.log(
        '[Renderer:App] Window opened/shown — resetting state and listing all tools.'
      )
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
          ;(window as any).core?.window?.esc?.()
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
      .then((res: IpcResult<LoadedExtension[]>) => {
        if (res.success && res.data) {
          setTools(res.data)
        }
      })
      .catch((e: unknown) => console.error('Failed to list tools:', e))
  }, [])

  // Fetch providers once on mount
  useEffect(() => {
    ;(window as any).core?.ipc
      ?.invoke('kernel', 'listProviders', {})
      .then((res: IpcResult<LoadedExtension[]>) => {
        if (res.success && res.data) {
          setProviders(res.data)
        }
      })
      .catch((e: unknown) => console.error('Failed to list providers:', e))
  }, [])

  // Fetch and apply theme once on mount
  useEffect(() => {
    ;(window as any).core?.ipc
      ?.invoke('kernel', 'getTheme', {})
      .then((res: IpcResult<ThemeDefinition>) => {
        if (res.success && res.data) {
          const themeData = res.data
          setThemeStyles(themeData.styles ?? null)

          if (themeData.colors) {
            const root = document.documentElement
            Object.entries(themeData.colors).forEach(([key, val]) => {
              root.style.setProperty(`--${key}`, val as string)
            })
          }
        }
      })
      .catch((e: unknown) => console.error('Failed to get theme:', e))
  }, [])

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
            subtitle: 'Boing! Boing! 🚀'
          }
        ])
        return
      }

      // 1. Convert registered tools to results format
      const toolItems: SearchResult[] = tools.map((t) => ({
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
          (item) =>
            item.title.toLowerCase().includes(savedQuery.toLowerCase()) ||
            item.id.toLowerCase().includes(savedQuery.toLowerCase())
        )
      }

      // 3. Fetch all provider results
      let providerResults: SearchResult[] = []
      if (savedQuery.trim().length > 0 && providers.length > 0) {
        try {
          const promises = providers.map(async (provider: LoadedExtension) => {
            try {
              const res = (await window.core.ipc.invoke(provider.id, 'eval', {
                text: savedQuery
              })) as IpcResult<{ items?: SearchResult[] }>
              if (res.success && res.data?.items) {
                return res.data.items
              }
            } catch (e) {
              console.error(
                `IPC invocation failed for provider ${provider.id}:`,
                e
              )
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

  const handleItemClick = (item: SearchResult) => {
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
        themeStyles?.container ||
        'w-full h-fit bg-bg-base rounded-xl shadow-2xl overflow-hidden'
      }
    >
      <div className="w-full text-syntax-variable">
        {/* Breadcrumb omniBar */}
        <div>
          <div
            ref={omniBarRef}
            className={`relative flex items-center gap-1.5 px-4 py-[13px] min-h-[52px] ${showOmniBar ? 'cursor-text' : 'cursor-default'}`}
            onClick={() => showOmniBar && inputRef.current?.focus()}
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
              className="absolute inset-0 opacity-0 w-full h-full cursor-text bg-transparent border-0 outline-none text-transparent caret-transparent z-0"
              aria-label="Search"
            />

            {/* Icon */}
            <span className="flex items-center text-syntax-comment shrink-0 z-[1]">
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
            <span className="text-syntax-comment text-[18px] leading-none select-none shrink-0 z-[1]">
              ›
            </span>

            {/* Tool name segment (only when a tool is active) */}
            {activeToolName && (
              <>
                <span className="flex items-center text-[15px] z-[1] text-syntax-operator font-medium tracking-[0.01em]">
                  {activeToolName}
                </span>
                <span className="text-syntax-comment text-[18px] leading-none select-none shrink-0 z-[1]">
                  ›
                </span>
              </>
            )}

            {/* Query / placeholder segment */}
            <span className="flex items-center text-[15px] z-[1] flex-1 min-w-0">
              {query ? (
                <span className="text-syntax-variable text-[15px] inline-flex items-center gap-px">
                  {query}
                  {showOmniBar && (
                    <span className="inline-block w-0.5 h-[1em] bg-syntax-operator ml-px align-text-bottom animate-cursor-blink" />
                  )}
                </span>
              ) : (
                <span className="text-syntax-keyword text-[15px]">
                  {showOmniBar && (
                    <span className="inline-block w-0.5 h-[1em] bg-syntax-operator ml-px align-text-bottom animate-cursor-blink" />
                  )}
                  {activeToolName
                    ? `Search ${activeToolName}`
                    : 'What do you have in mind?'}
                </span>
              )}
            </span>
          </div>
        </div>

        {results.length > 0 && !activeTool && (
          <div
            className={
              'mt-0 border-t border-syntax-comment flex flex-col gap-0 max-h-[350px] overflow-y-auto custom-scrollbar'
            }
          >
            {results.map((item, index) => (
              <div
                key={item.id}
                className={
                  index === selectedIndex
                    ? themeStyles?.itemActive
                    : themeStyles?.itemInactive
                }
                onClick={() => handleItemClick(item)}
              >
                <span
                  className={
                    index === selectedIndex
                      ? themeStyles?.itemTitleActive
                      : themeStyles?.itemTitleInactive
                  }
                >
                  {item.title}
                </span>
                <span
                  className={
                    index === selectedIndex
                      ? themeStyles?.itemSubtitleActive
                      : themeStyles?.itemSubtitleInactive
                  }
                >
                  {item.subtitle}
                </span>
              </div>
            ))}
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
