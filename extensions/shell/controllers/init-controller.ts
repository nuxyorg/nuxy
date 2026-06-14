import type { ShellConfig, Tool, Provider, Orchestrator, UsageStats } from '../types.ts'
import { SHELL_EXT_ID } from '../utils.ts'
import { syncToolSearchPlaceholder } from '../utils/toolSearchPlaceholder.ts'

export interface InitControllerCallbacks {
  getActiveTool: () => string | null
  applySettings: (s: ShellConfig) => void
  setSearchIcon: (svg: string) => void
  setTools: (tools: Tool[]) => void
  setProviders: (providers: Provider[]) => void
  setOrchestrators: (orchestrators: Orchestrator[]) => void
  setRecentToolIds: (ids: string[]) => void
  setUsageStats: (stats: UsageStats) => void
  setThemeStyles: (styles: Record<string, string>) => void
  setCfg: (cfg: ShellConfig) => void
  recompute: () => void
  syncProviders: () => void
}

export class InitController {
  private cleanups: Array<() => void> = []

  constructor(private readonly callbacks: InitControllerCallbacks) {}

  load(): void {
    this._fetchSearchIcon()
    this._fetchConfig()
    this._fetchAll()
    this._fetchTheme()
    this._fetchUserSettings()
    this._fetchRecentTools()
    this._fetchUsageStats()
    this._bindLocaleChange()
  }

  destroy(): void {
    this.cleanups.forEach((fn) => fn())
    this.cleanups = []
  }

  private _fetchSearchIcon(): void {
    window.core?.icons
      ?.get('search')
      .then((res: unknown) => {
        const r = res as { success?: boolean; data?: string } | string | null
        const svg = (r as { success?: boolean; data?: string })?.success
          ? (r as { success: boolean; data: string }).data
          : r
        if (typeof svg === 'string') this.callbacks.setSearchIcon(svg)
      })
      .catch(() => {})
  }

  private _fetchTools(): void {
    window.core?.ipc?.invoke('kernel', 'listTools', {}).then((res: unknown) => {
      const r = res as { success: boolean; data: Tool[] }
      if (!r.success || !r.data) return
      const filtered = r.data.filter((t) => t.id !== SHELL_EXT_ID)
      this.callbacks.setTools(filtered)
      this.callbacks.recompute()
    })
  }

  private _fetchProviders(): void {
    window.core?.ipc?.invoke('kernel', 'listProviders', {}).then((res: unknown) => {
      const r = res as { success: boolean; data: Provider[] }
      if (r.success && r.data) {
        this.callbacks.setProviders(r.data)
        this.callbacks.syncProviders()
      }
    })
  }

  private _fetchOrchestrators(): void {
    window.core?.ipc?.invoke('kernel', 'listOrchestrators', {}).then((res: unknown) => {
      const r = res as { success: boolean; data: Orchestrator[] }
      if (r.success && r.data) this.callbacks.setOrchestrators(r.data)
    })
  }

  private _fetchAll(): void {
    this._fetchTools()
    this._fetchProviders()
    this._fetchOrchestrators()
  }

  private _fetchConfig(): void {
    window.core?.ipc?.invoke('kernel', 'getConfig', {}).then((res: unknown) => {
      const r = res as { success: boolean; data: ShellConfig }
      if (r.success && r.data) {
        this.callbacks.setCfg(r.data)
        this.callbacks.applySettings(r.data)
        window.dispatchEvent(new Event('resize'))
      }
    })
  }

  private _fetchTheme(): void {
    window.core?.ipc?.invoke('kernel', 'getTheme', {}).then((res: unknown) => {
      const r = res as {
        success: boolean
        data: { styles?: Record<string, string>; colors?: Record<string, string> }
      }
      if (r.success && r.data?.styles) this.callbacks.setThemeStyles(r.data.styles)
      if (r.success && r.data?.colors) {
        const root = document.documentElement
        Object.entries(r.data.colors).forEach(([key, val]) =>
          root.style.setProperty(`--${key}`, val)
        )
      }
    })
  }

  private _fetchUserSettings(): void {
    window.core?.ipc
      ?.invoke('com.nuxy.settings', 'getSettings', {})
      .then((res: unknown) => {
        const r = res as { success: boolean; data: ShellConfig } | null
        if (!r?.success || !r.data) return
        this.callbacks.applySettings(r.data)
      })
      .catch(() => {})
  }

  private _fetchRecentTools(): void {
    window.core?.ipc
      ?.invoke(SHELL_EXT_ID, 'getRecentTools', {})
      .then((res: unknown) => {
        const r = res as { success: boolean; data: string[] } | null
        if (r?.success && Array.isArray(r.data)) {
          this.callbacks.setRecentToolIds(r.data)
          this.callbacks.recompute()
        }
      })
      .catch(() => {})
  }

  private _fetchUsageStats(): void {
    window.core?.ipc
      ?.invoke(SHELL_EXT_ID, 'getUsageStats', {})
      .then((res: unknown) => {
        const r = res as { success: boolean; data: UsageStats } | null
        if (r?.success && r.data) {
          this.callbacks.setUsageStats(r.data)
          this.callbacks.recompute()
        }
      })
      .catch(() => {})
  }

  private _bindLocaleChange(): void {
    const offLocale = window.core?.events?.on('locale-changed', () => {
      this._fetchAll()
      const toolId = this.callbacks.getActiveTool()
      if (toolId) {
        syncToolSearchPlaceholder(toolId, () => this.callbacks.getActiveTool() === toolId)
      }
    })
    if (offLocale) this.cleanups.push(offLocale)
  }
}
