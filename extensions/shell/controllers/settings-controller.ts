import type { ReactiveController, ReactiveControllerHost } from '@nuxyorg/core'
import type { ShellConfig } from '../types.ts'

const FONT_FAMILY_MAP: Record<string, string> = {
  system: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
  monospace: 'monospace',
}

export class SettingsController implements ReactiveController {
  private _settings: ShellConfig = {}

  get settings(): ShellConfig {
    return this._settings
  }

  constructor(private readonly host: ReactiveControllerHost) {
    host.addController(this)
  }

  hostConnected(): void {}

  applySettings(s: ShellConfig): void {
    this._settings = { ...this._settings, ...s }
    this.applySettingsToDOM(s)
    this.host.requestUpdate()
  }

  applySettingsToDOM(s: ShellConfig): void {
    if (s.zoom) document.documentElement.style.zoom = s.zoom
    if (s.font) document.body.style.fontFamily = FONT_FAMILY_MAP[s.font] || s.font
    if (s.theme) this.applyThemeByName(s.theme)

    if (s.kbdScheme) {
      let scheme = s.kbdScheme
      if (scheme === 'auto') {
        const isMac =
          typeof navigator !== 'undefined' &&
          (/Mac|iPad|iPhone|iPod/.test(navigator.platform) ||
            /Mac|iPad|iPhone|iPod/.test(navigator.userAgent))
        scheme = isMac ? 'mac' : 'windows'
      }
      const attrValue = scheme === 'mac' ? 'mac' : 'pc'
      document.documentElement.setAttribute('data-kbd-scheme', attrValue)
      document.dispatchEvent(new CustomEvent('nuxy-kbd-scheme-updated'))
    }
  }

  applyThemeByName(name: string): void {
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
}
