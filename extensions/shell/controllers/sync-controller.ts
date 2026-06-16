import type { ShellBridgeSnapshot } from '@nuxyorg/core'
import type { ShellConfig } from '../types.ts'
import { getZoom } from '../utils/zoom.ts'
import { parseCoordinate } from '../utils.ts'

const FONT_FAMILY_MAP: Record<string, string> = {
  system: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
  monospace: 'monospace',
}

export interface SyncControllerCallbacks {
  getContainer: () => HTMLElement | null
  getInput: () => HTMLInputElement | null
  getCfg: () => ShellConfig | null
  getSettings: () => ShellConfig
  setCfg: (cfg: ShellConfig) => void
  hasDragged: () => boolean
  setHasDragged: (val: boolean) => void
  setDragging: (val: boolean) => void
  animatePosition: (pos: { x: number; y: number }) => void
  setBridge: (snapshot: ShellBridgeSnapshot) => void
  getEmptyBridge: () => ShellBridgeSnapshot
  resetTool: () => void
  closeCommandPalette: () => void
  clearProviderStates: () => void
  syncProviders: () => void
  recompute: () => void
  returnToShell: () => void
  applySettings: (s: ShellConfig) => void
}

export class SyncController {
  private cleanups: Array<() => void> = []

  constructor(private readonly callbacks: SyncControllerCallbacks) {}

  bindBridge(): void {
    const shell = window.core?.shell
    if (!shell) return

    const sync = () => {
      this.callbacks.setBridge(shell.getSnapshot() ?? this.callbacks.getEmptyBridge())
    }
    sync()
    const off = shell.subscribe(sync)
    this.cleanups.push(off)
  }

  bindSync(): void {
    let lastZoom = document.documentElement.style.zoom || '100%'

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'style') {
          const currentZoom = document.documentElement.style.zoom || '100%'
          if (currentZoom !== lastZoom) {
            lastZoom = currentZoom
            this.callbacks.setHasDragged(false)
            setTimeout(() => this.updatePosition(true), 10)
          }
        }
      }
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
    this.cleanups.push(() => observer.disconnect())

    const onReset = () => {
      this.callbacks.resetTool()
      this.callbacks.closeCommandPalette()
      this.callbacks.clearProviderStates()
      this.callbacks.setHasDragged(false)
      this.callbacks.setDragging(false)
      requestAnimationFrame(() => this.updatePosition(true))
      window.core?.shell?.resetToolState()
      this.callbacks.syncProviders()
      this.callbacks.recompute()
      setTimeout(() => this.callbacks.getInput()?.focus(), 50)
    }

    const onFocus = () => {
      const paletteInput = document
        .querySelector('nuxy-command-palette')
        ?.shadowRoot?.querySelector('.nuxy-command-palette__input')
      if (paletteInput) {
        ;(paletteInput as HTMLInputElement).focus()
      } else {
        this.callbacks.getInput()?.focus()
      }
    }

    const handleSettingsUpdate = (detail: Record<string, unknown>) => {
      if (detail) {
        this.callbacks.applySettings(detail as ShellConfig)
        const cfg = this.callbacks.getCfg()
        if (cfg) this.callbacks.setCfg({ ...cfg, ...(detail as ShellConfig) })
        setTimeout(() => this.updatePosition(true), 0)
      }
    }

    const onResize = () => this.updatePosition(false)

    const offShellReset = window.core?.events?.on('shell-reset', onReset)
    window.addEventListener('focus', onFocus)
    window.addEventListener('resize', onResize)
    const offSettings = window.core?.events?.on('settings-updated', handleSettingsUpdate)

    this.cleanups.push(() => {
      offShellReset?.()
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('resize', onResize)
      offSettings?.()
    })

    const shell = window.core?.shell
    if (shell) {
      const offReturn = shell.bindReturnToShell(() => this.callbacks.returnToShell())
      this.cleanups.push(offReturn)
    }
  }

  updatePosition(force = false, heightOverride?: number): void {
    const cfg = this.callbacks.getCfg() ?? this.callbacks.getSettings()
    const container = this.callbacks.getContainer()
    if (!cfg?.windowPosition || !container) return
    if (!force && this.callbacks.hasDragged()) return
    const parts = cfg.windowPosition.split(/[\s,]+/)
    const winWidth = container.offsetWidth
    const winHeight = heightOverride ?? container.offsetHeight
    const zoom = getZoom()
    const dw = window.innerWidth / zoom
    const dh = window.innerHeight / zoom
    this.callbacks.animatePosition({
      x: parseCoordinate(parts[0], dw, winWidth),
      y: parseCoordinate(parts.length >= 2 ? parts[1] : '', dh, winHeight),
    })
  }

  destroy(): void {
    this.cleanups.forEach((fn) => fn())
    this.cleanups = []
  }
}

export function applyThemeByName(name: string): void {
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

export function applySettingsToDOM(s: ShellConfig): void {
  if (s.zoom) document.documentElement.style.zoom = s.zoom
  if (s.font) document.body.style.fontFamily = FONT_FAMILY_MAP[s.font] || s.font
  if (s.theme) applyThemeByName(s.theme)

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
