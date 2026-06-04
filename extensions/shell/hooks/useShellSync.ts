const React = window.React

import type { ShellConfig, CommandPaletteAction, KeyAction } from '../types.ts'
import { getZoom } from '../utils/zoom.ts'

interface Params {
  containerRef: React.RefObject<HTMLDivElement | null>
  inputRef: React.RefObject<HTMLInputElement | null>
  cfgRef: React.MutableRefObject<ShellConfig | null>
  hasDragged: React.MutableRefObject<boolean>
  activeTool: string | null
  parseCoordinate: (
    val: string | null | undefined,
    displayLength: number,
    winLength: number
  ) => number
  setPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
  setQuery: React.Dispatch<React.SetStateAction<string>>
  setSavedQuery: React.Dispatch<React.SetStateAction<string>>
  setProviderStates: React.Dispatch<React.SetStateAction<Record<string, ProviderState>>>
  setActiveTool: React.Dispatch<React.SetStateAction<string | null>>
  setToolComponent: React.Dispatch<
    React.SetStateAction<React.ComponentType<{ query: string; extensionId?: string }> | null>
  >
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
  setShowOmniBar: React.Dispatch<React.SetStateAction<boolean>>
  setShowCommandPalette: React.Dispatch<React.SetStateAction<boolean>>
  setSettings: React.Dispatch<React.SetStateAction<ShellConfig>>
  setToolActions: React.Dispatch<React.SetStateAction<CommandPaletteAction[]>>
  setKeyActionHints: React.Dispatch<React.SetStateAction<KeyAction[]>>
  setFooterHints: React.Dispatch<React.SetStateAction<React.ReactNode | null>>
  setOmniBarPortal: React.Dispatch<React.SetStateAction<React.ReactNode | null>>
  keyActionsGetterRef: React.MutableRefObject<(() => KeyAction[]) | null>
  toolActionsRef: React.MutableRefObject<CommandPaletteAction[]>
}

// ProviderState imported inline to avoid circular dep — only shape needed here
type ProviderState = Record<string, unknown>

export function useShellSync({
  containerRef,
  inputRef,
  cfgRef,
  hasDragged,
  activeTool,
  parseCoordinate,
  setPosition,
  setQuery,
  setSavedQuery,
  setProviderStates,
  setActiveTool,
  setToolComponent,
  setSelectedIndex,
  setShowOmniBar,
  setShowCommandPalette,
  setSettings,
  setToolActions,
  setKeyActionHints,
  setFooterHints,
  setOmniBarPortal,
  keyActionsGetterRef,
  toolActionsRef,
}: Params): void {
  // Dispatch nuxy-shell-mounted on first render
  React.useEffect(() => {
    if (containerRef.current) {
      window.dispatchEvent(
        new CustomEvent('nuxy-shell-mounted', {
          detail: { container: containerRef.current },
        })
      )
    }
  }, [])

  // Stable position update helper — defined once, stable reference
  const updatePosition = React.useCallback(
    (force = false) => {
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // Zoom mutation observer + event listeners (reset, focus, resize, settings)
  React.useEffect(() => {
    let lastZoom = document.documentElement.style.zoom || '100%'

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
      setProviderStates({} as any)
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

    const onResize = () => updatePosition(false)

    window.addEventListener('nuxy-shell-reset', onReset)
    window.addEventListener('focus', onFocus)
    window.addEventListener('resize', onResize)
    window.addEventListener('nuxy-settings-updated', handleSettingsUpdate)

    return () => {
      observer.disconnect()
      window.removeEventListener('nuxy-shell-reset', onReset)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('nuxy-settings-updated', handleSettingsUpdate)
    }
  }, [])

  // Listen for nuxy-register-actions (tool action palette items)
  React.useEffect(() => {
    const handleActions = (e: Event) => {
      const actions = (e as CustomEvent<CommandPaletteAction[]>).detail || []
      setToolActions(actions)
      toolActionsRef.current = actions
    }
    window.addEventListener('nuxy-register-actions', handleActions)
    return () => window.removeEventListener('nuxy-register-actions', handleActions)
  }, [])

  // Reset tool-scoped state when active tool changes
  React.useEffect(() => {
    setToolActions([])
    keyActionsGetterRef.current = null
    setKeyActionHints([])
    setFooterHints(null)
    setOmniBarPortal(null)
  }, [activeTool])

  // Listen for nuxy-register-key-actions + nuxy-key-hints-changed
  React.useEffect(() => {
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

  // Listen for nuxy-shell-footer-hints
  React.useEffect(() => {
    const handleFooterHints = (e: Event) =>
      setFooterHints((e as CustomEvent<React.ReactNode>).detail || null)
    window.addEventListener('nuxy-shell-footer-hints', handleFooterHints)
    return () => window.removeEventListener('nuxy-shell-footer-hints', handleFooterHints)
  }, [])

  // Listen for nuxy-omnibar-portal
  React.useEffect(() => {
    const handlePortal = (e: Event) =>
      setOmniBarPortal((e as CustomEvent<React.ReactNode>).detail ?? null)
    window.addEventListener('nuxy-omnibar-portal', handlePortal)
    return () => window.removeEventListener('nuxy-omnibar-portal', handlePortal)
  }, [])

  // Listen for nuxy-shell-omni-bar-control
  React.useEffect(() => {
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

  // Clamp position when the shell panel resizes (content/tool changes), not on every list update
  React.useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    const clampToViewport = () => {
      const zoom = getZoom()
      const dw = window.innerWidth / zoom
      const dh = window.innerHeight / zoom
      const winWidth = el.offsetWidth
      const winHeight = el.offsetHeight
      const maxX = Math.max(0, dw - winWidth)
      const maxY = Math.max(0, dh - winHeight)

      setPosition((prev) => {
        const clampedX = Math.max(0, Math.min(prev.x, maxX))
        const clampedY = Math.max(0, Math.min(prev.y, maxY))
        if (clampedX !== prev.x || clampedY !== prev.y) return { x: clampedX, y: clampedY }
        return prev
      })
    }

    clampToViewport()
    const observer = new ResizeObserver(clampToViewport)
    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool])
}
