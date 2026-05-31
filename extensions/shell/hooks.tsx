const React = window.React
const { useEffect, useMemo, useState } = React

import type {
  Tool,
  Provider,
  Orchestrator,
  ShellConfig,
  ProviderState,
  KeyAction,
} from './types.ts'

export function useShellInit({
  cfgRef,
  setTools,
  setProviders,
  setOrchestrators,
  setThemeStyles,
  setSettings,
  setSearchIcon,
  setToolIcons,
  SHELL_EXT_ID,
}: {
  cfgRef: React.MutableRefObject<ShellConfig | null>
  setTools: (tools: Tool[]) => void
  setProviders: (providers: Provider[]) => void
  setOrchestrators: (orchestrators: Orchestrator[]) => void
  setThemeStyles: (styles: Record<string, string> | null) => void
  setSettings: (settings: ShellConfig | null) => void
  setSearchIcon: (icon: string | null) => void
  setToolIcons?: (icons: Record<string, string>) => void
  SHELL_EXT_ID: string
}): void {
  useEffect(() => {
    window.core?.icons
      ?.get('search')
      .then((res: unknown) => {
        const r = res as { success?: boolean; data?: string } | string | null
        const svg = (r as { success?: boolean; data?: string })?.success
          ? (r as { success: boolean; data: string }).data
          : r
        if (typeof svg === 'string') setSearchIcon(svg)
      })
      .catch(() => {})

    const FONT_FAMILY_MAP: Record<string, string> = {
      system: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
      monospace: 'monospace',
    }

    const applyTheme = (name: string) => {
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
          if (colors)
            Object.entries(colors).forEach(([k, v]) => root.style.setProperty(`--${k}`, v))
          if (tokens)
            Object.entries(tokens).forEach(([k, v]) => root.style.setProperty(`--${k}`, v))
        })
        .catch(() => {})
    }

    window.core?.ipc?.invoke('kernel', 'getConfig', {}).then((res: unknown) => {
      const r = res as { success: boolean; data: ShellConfig }
      if (r.success && r.data) {
        cfgRef.current = r.data
        const s = r.data
        setSettings(s)
        if (s.zoom) document.documentElement.style.zoom = s.zoom
        if (s.font) document.body.style.fontFamily = FONT_FAMILY_MAP[s.font] || s.font
        if (s.theme) applyTheme(s.theme)
        window.dispatchEvent(new Event('resize'))
      }
    })

    window.core?.ipc?.invoke('kernel', 'listTools', {}).then((res: unknown) => {
      const r = res as { success: boolean; data: Tool[] }
      if (r.success && r.data) {
        const filtered = r.data.filter((t) => t.id !== SHELL_EXT_ID)
        setTools(filtered)
        // Prefetch icons for all tools that declare one in their manifest
        if (setToolIcons) {
          const iconMap: Record<string, string> = {}
          const fetches = filtered
            .filter((t) => t.manifest?.icon)
            .map((t) =>
              window.core?.icons
                ?.get(t.manifest.icon!)
                .then((iconRes: unknown) => {
                  const ir = iconRes as { success?: boolean; data?: string } | string | null
                  const svg = (ir as { success?: boolean; data?: string })?.success
                    ? (ir as { success: boolean; data: string }).data
                    : ir
                  if (typeof svg === 'string') iconMap[t.id] = svg
                })
                .catch(() => {})
            )
          Promise.all(fetches).then(() => setToolIcons({ ...iconMap }))
        }
      }
    })
    window.core?.ipc?.invoke('kernel', 'listProviders', {}).then((res: unknown) => {
      const r = res as { success: boolean; data: Provider[] }
      if (r.success && r.data) setProviders(r.data)
    })
    window.core?.ipc?.invoke('kernel', 'listOrchestrators', {}).then((res: unknown) => {
      const r = res as { success: boolean; data: Orchestrator[] }
      if (r.success && r.data) setOrchestrators(r.data)
    })
    window.core?.ipc?.invoke('kernel', 'getTheme', {}).then((res: unknown) => {
      const r = res as {
        success: boolean
        data: { styles?: Record<string, string>; colors?: Record<string, string> }
      }
      if (r.success && r.data?.styles) setThemeStyles(r.data.styles)
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
        const s = r.data
        setSettings(s)
        if (s.zoom) document.documentElement.style.zoom = s.zoom
        if (s.font) document.body.style.fontFamily = FONT_FAMILY_MAP[s.font] || s.font
        if (s.theme) applyTheme(s.theme)
      })
      .catch(() => {})
  }, [])
}

export function useProviders({
  activeTool,
  savedQuery,
  providers,
  providerStates,
  setProviderStates,
  queryGeneration,
}: {
  activeTool: string | null
  savedQuery: string
  providers: Provider[]
  providerStates: Record<string, ProviderState>
  setProviderStates: React.Dispatch<React.SetStateAction<Record<string, ProviderState>>>
  queryGeneration: React.MutableRefObject<number>
}): { isAnyListProviderLoading: boolean } {
  useEffect(() => {
    if (activeTool) {
      setProviderStates({})
      return
    }
    const generation = ++queryGeneration.current
    if (savedQuery.trim().length === 0) {
      setProviderStates({})
      return
    }

    providers.forEach((provider) => {
      const type = (provider.manifest?.providerType as ProviderState['type']) || 'list'
      const name = provider.manifest?.name || provider.id
      setProviderStates((prev) => ({
        ...prev,
        [provider.id]: { loading: true, items: [], type, name },
      }))
      window.core?.ipc
        ?.invoke(provider.id, 'eval', { text: savedQuery })
        .then((res: unknown) => {
          if (generation !== queryGeneration.current) return
          const r = res as { success: boolean; data?: { items?: ProviderState['items'] } } | null
          setProviderStates((prev) => ({
            ...prev,
            [provider.id]: {
              loading: false,
              items: r?.success && r.data?.items ? r.data.items : [],
              type,
              name,
            },
          }))
        })
        .catch((_e: unknown) => {
          if (generation !== queryGeneration.current) return
          setProviderStates((prev) => ({
            ...prev,
            [provider.id]: { loading: false, items: [], type, name },
          }))
        })
    })
  }, [savedQuery, activeTool, providers])

  const isAnyListProviderLoading = useMemo(() => {
    return Object.values(providerStates).some((state) => state.type === 'list' && state.loading)
  }, [providerStates])

  return { isAnyListProviderLoading }
}

function matchesAction(action: KeyAction, e: KeyboardEvent): boolean {
  if (action.key.toLowerCase() !== e.key.toLowerCase()) return false
  const mods = action.modifiers || []
  if (mods.includes('ctrl') !== e.ctrlKey) return false
  if (mods.includes('shift') !== e.shiftKey) return false
  if (mods.includes('alt') !== e.altKey) return false
  if (mods.includes('meta') !== e.metaKey) return false
  return true
}

export function useToolHistory(SHELL_EXT_ID: string): {
  recentToolIds: string[]
  recordToolUsed: (toolId: string) => void
} {
  const [recentToolIds, setRecentToolIds] = useState<string[]>([])

  useEffect(() => {
    window.core?.ipc
      ?.invoke(SHELL_EXT_ID, 'getRecentTools', {})
      .then((res: unknown) => {
        const r = res as { success: boolean; data: string[] } | null
        if (r?.success && Array.isArray(r.data)) setRecentToolIds(r.data)
      })
      .catch(() => {})
  }, [])

  function recordToolUsed(toolId: string): void {
    window.core?.ipc
      ?.invoke(SHELL_EXT_ID, 'recordToolUsed', toolId)
      .then((res: unknown) => {
        const r = res as { success: boolean; data: string[] } | null
        if (r?.success && Array.isArray(r.data)) setRecentToolIds(r.data)
      })
      .catch(() => {})
  }

  return { recentToolIds, recordToolUsed }
}

export function useKeyboard({
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
}: {
  activeTool: string | null
  showCommandPalette: boolean
  setShowCommandPalette: React.Dispatch<React.SetStateAction<boolean>>
  inputRef: React.RefObject<HTMLInputElement | null>
  setActiveTool: (tool: string | null) => void
  setToolComponent: (
    component: React.ComponentType<{ query: string; extensionId?: string }> | null
  ) => void
  setQuery: (query: string) => void
  setSavedQuery: (query: string) => void
  setSelectedIndex: (index: number) => void
  setShowOmniBar: (show: boolean) => void
  keyActionsGetterRef: React.MutableRefObject<(() => KeyAction[]) | null>
  toolActionsRef: React.MutableRefObject<KeyAction[]>
}): void {
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (toolActionsRef?.current?.length > 0) {
          setShowCommandPalette((prev) => !prev)
        }
        return
      }
      if (e.key === 'Escape') {
        if (showCommandPalette) {
          setShowCommandPalette(false)
          setTimeout(() => inputRef.current?.focus(), 50)
          return
        }
        if (activeTool) {
          // Let the active tool handle Escape first (e.g. go back within a view hierarchy)
          const actions = keyActionsGetterRef?.current?.()
          if (actions && actions.length > 0) {
            const matched = actions.find((a) => {
              if (!matchesAction(a, e)) return false
              if (typeof a.activeOn === 'function' && !a.activeOn()) return false
              return true
            })
            if (matched) {
              matched.handler()
              e.preventDefault()
              return
            }
          }
          setActiveTool(null)
          setToolComponent(null)
          setQuery('')
          setSavedQuery('')
          setSelectedIndex(0)
          setShowOmniBar(true)
          setTimeout(() => inputRef.current?.focus(), 50)
        } else {
          setQuery('')
          setSavedQuery('')
          setSelectedIndex(-1)
          window.core?.window?.esc?.()
        }
        return
      }
      if (showCommandPalette) return
      if (activeTool) {
        // Check registered key actions. Skip modifier-free single-char actions when
        // an input/textarea has focus so the user can type freely.
        const target = e.target as HTMLElement
        const isInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
        const isOmniBar = target?.classList?.contains('nuxy-shell-omni-bar__input')
        const actions = keyActionsGetterRef?.current?.()
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
            matched.handler()
            e.preventDefault()
            return
          }
        }
        // Fall back to legacy event dispatch only for non-input targets (backward compat)
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
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [activeTool, showCommandPalette])
}
