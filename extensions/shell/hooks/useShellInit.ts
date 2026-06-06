const React = window.React
const { useEffect } = React

import type { Tool, Provider, Orchestrator, ShellConfig } from '../types.ts'

const FONT_FAMILY_MAP: Record<string, string> = {
  system: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
  monospace: 'monospace',
}

function applyTheme(name: string) {
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

function applySettings(s: ShellConfig, setSettings: (s: ShellConfig | null) => void) {
  setSettings(s)
  if (s.zoom) document.documentElement.style.zoom = s.zoom
  if (s.font) document.body.style.fontFamily = FONT_FAMILY_MAP[s.font] || s.font
  if (s.theme) applyTheme(s.theme)
}

function fetchAndSetTools(
  SHELL_EXT_ID: string,
  setTools: (tools: Tool[]) => void,
  setToolIcons?: (icons: Record<string, string>) => void
) {
  window.core?.ipc?.invoke('kernel', 'listTools', {}).then((res: unknown) => {
    const r = res as { success: boolean; data: Tool[] }
    if (!r.success || !r.data) return
    const filtered = r.data.filter((t) => t.id !== SHELL_EXT_ID)
    setTools(filtered)
    if (!setToolIcons) return
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
  })
}

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

    const fetchProviders = () => {
      window.core?.ipc?.invoke('kernel', 'listProviders', {}).then((res: unknown) => {
        const r = res as { success: boolean; data: Provider[] }
        if (r.success && r.data) setProviders(r.data)
      })
    }

    const fetchOrchestrators = () => {
      window.core?.ipc?.invoke('kernel', 'listOrchestrators', {}).then((res: unknown) => {
        const r = res as { success: boolean; data: Orchestrator[] }
        if (r.success && r.data) setOrchestrators(r.data)
      })
    }

    const fetchAll = () => {
      fetchAndSetTools(SHELL_EXT_ID, setTools, setToolIcons)
      fetchProviders()
      fetchOrchestrators()
    }

    window.core?.ipc?.invoke('kernel', 'getConfig', {}).then((res: unknown) => {
      const r = res as { success: boolean; data: ShellConfig }
      if (r.success && r.data) {
        cfgRef.current = r.data
        applySettings(r.data, setSettings)
        window.dispatchEvent(new Event('resize'))
      }
    })

    fetchAll()

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
        applySettings(r.data, setSettings)
      })
      .catch(() => {})

    window.addEventListener('nuxy-locale-changed', fetchAll)
    return () => window.removeEventListener('nuxy-locale-changed', fetchAll)
  }, [])
}
