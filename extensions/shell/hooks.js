const React = window.React
const { useEffect, useMemo } = React

export function useShellInit({
  cfgRef,
  setTools,
  setProviders,
  setOrchestrators,
  setThemeStyles,
  setSettings,
  setSearchIcon,
  SHELL_EXT_ID
}) {
  useEffect(() => {
    window.core?.icons?.get('search').then((res) => {
      const svg = res?.success ? res.data : res
      if (typeof svg === 'string') setSearchIcon(svg)
    }).catch(() => {})

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
        Object.entries(res.data.colors).forEach(([key, val]) => root.style.setProperty(`--${key}`, val))
      }
    })

    const FONT_FAMILY_MAP = {
      system: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
      monospace: 'monospace',
    }

    window.core?.ipc?.invoke('com.nuxy.settings', 'getSettings', {})
      .then((res) => {
        if (!res?.success || !res.data) return
        const s = res.data
        setSettings(s)
        if (s.zoom) document.documentElement.style.zoom = s.zoom
        if (s.font) document.body.style.fontFamily = FONT_FAMILY_MAP[s.font] || s.font
        if (s.theme) {
          window.core.ipc.invoke('kernel', 'getThemeByName', { name: s.theme })
            .then((themeRes) => {
              if (!themeRes?.success || !themeRes.data) return
              const { colors, tokens } = themeRes.data
              const root = document.documentElement
              if (colors) Object.entries(colors).forEach(([k, v]) => root.style.setProperty(`--${k}`, v))
              if (tokens) Object.entries(tokens).forEach(([k, v]) => root.style.setProperty(`--${k}`, v))
            })
            .catch(console.error)
        }
      })
      .catch(console.error)
  }, [])
}

export function useProviders({
  activeTool,
  savedQuery,
  providers,
  providerStates,
  setProviderStates,
  queryGeneration
}) {
  useEffect(() => {
    if (activeTool) { setProviderStates({}); return }
    const generation = ++queryGeneration.current
    if (savedQuery.trim().length === 0) { setProviderStates({}); return }

    providers.forEach((provider) => {
      const type = provider.manifest?.providerType || 'list'
      const name = provider.manifest?.name || provider.id
      setProviderStates((prev) => ({ ...prev, [provider.id]: { loading: true, items: [], type, name } }))
      window.core?.ipc?.invoke(provider.id, 'eval', { text: savedQuery })
        .then((res) => {
          if (generation !== queryGeneration.current) return
          setProviderStates((prev) => ({
            ...prev,
            [provider.id]: { loading: false, items: (res?.success && res.data?.items) ? res.data.items : [], type, name },
          }))
        })
        .catch((e) => {
          console.error(`Provider ${provider.id} failed:`, e)
          if (generation !== queryGeneration.current) return
          setProviderStates((prev) => ({ ...prev, [provider.id]: { loading: false, items: [], type, name } }))
        })
    })
  }, [savedQuery, activeTool, providers])

  const isAnyListProviderLoading = useMemo(() => {
    return Object.values(providerStates).some(
      (state) => state.type === 'list' && state.loading
    )
  }, [providerStates])

  return { isAnyListProviderLoading }
}

function matchesAction(action, e) {
  if (action.key !== e.key) return false
  const mods = action.modifiers || []
  if (mods.includes('ctrl') !== e.ctrlKey) return false
  if (mods.includes('shift') !== e.shiftKey) return false
  if (mods.includes('alt') !== e.altKey) return false
  if (mods.includes('meta') !== e.metaKey) return false
  return true
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
}) {
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
      if (activeTool) {
        // Check registered key actions first — even when an input has focus,
        // so tools can intercept arrow keys while the omni bar is still visible.
        const actions = keyActionsGetterRef?.current?.()
        if (actions && actions.length > 0) {
          const matched = actions.find((a) => matchesAction(a, e))
          if (matched) {
            matched.handler()
            e.preventDefault()
            return
          }
        }
        // Fall back to legacy event dispatch only for non-input targets (backward compat)
        if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
          window.dispatchEvent(new CustomEvent('nuxy-shell-omni-bar-keydown', {
            detail: { key: e.key, code: e.code, shiftKey: e.shiftKey, altKey: e.altKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey },
          }))
          if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Space'].includes(e.key)) {
            e.preventDefault()
          }
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [activeTool, showCommandPalette])
}
