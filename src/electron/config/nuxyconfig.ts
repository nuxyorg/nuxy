import fs from 'fs'
import path from 'path'
import os from 'os'
import { kernelLogger } from '@nuxy/core'
import { CONFIG_DIR, CONFIG_PATH } from './paths.js'
import { ensureUserThemes } from '../themes/install.js'

const log = kernelLogger.child('NuxyConfig')

export type EscAction = 'hide' | 'minimize' | 'quit' | 'none'
export type Theme = 'dark' | 'light' | 'system'

export interface NuxyConfig {
  theme: Theme
  escAction: EscAction
  windowWidth: number
  windowMaxHeight: number
  alwaysOnTop: boolean
  opacity: number
  showInTaskbar: boolean
  startHidden: boolean
  windowPosition?: string
}

const DEFAULTS: NuxyConfig = {
  theme: 'dark',
  escAction: 'hide',
  windowWidth: 800,
  windowMaxHeight: 600,
  alwaysOnTop: false,
  opacity: 1,
  showInTaskbar: false,
  startHidden: false
}

export { CONFIG_DIR, CONFIG_PATH, THEMES_DIR } from './paths.js'
export { DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME } from '../themes/install.js'

function parseConfig(raw: string): Partial<NuxyConfig> {
  const result: Record<string, unknown> = {}

  for (const rawLine of raw.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const eqIdx = line.indexOf('=')
    if (eqIdx === -1) continue

    const key = line.slice(0, eqIdx).trim()
    const value = line
      .slice(eqIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, '')

    switch (key) {
      case 'theme':
        if (['dark', 'light', 'system'].includes(value))
          result.theme = value as Theme
        break
      case 'escAction':
        if (['hide', 'minimize', 'quit', 'none'].includes(value))
          result.escAction = value as EscAction
        break
      case 'windowWidth': {
        const w = Number(value)
        if (!Number.isNaN(w) && w >= 200 && w <= 4096) result.windowWidth = w
        break
      }
      case 'windowMaxHeight': {
        const h = Number(value)
        if (!Number.isNaN(h) && h >= 48 && h <= 4096) result.windowMaxHeight = h
        break
      }
      case 'alwaysOnTop':
        result.alwaysOnTop = value === 'true'
        break
      case 'opacity':
        result.opacity = Math.min(1, Math.max(0, Number(value)))
        break
      case 'showInTaskbar':
        result.showInTaskbar = value === 'true'
        break
      case 'startHidden':
        result.startHidden = value === 'true'
        break
      case 'windowPosition':
        result.windowPosition = value
        break
      default:
        log.warn(`Unknown config key ignored: "${key}"`)
    }
  }

  return result as Partial<NuxyConfig>
}

function writeDefaultConfig(): void {
  const content = `# Nuxy Configuration File
# Located at: ~/.nuxy/nuxyconfig

theme = dark
escAction = hide
windowWidth     = 800
windowMaxHeight = 600
alwaysOnTop = false
opacity = 1
showInTaskbar = false
startHidden = false
`

  fs.writeFileSync(CONFIG_PATH, content, 'utf-8')
  log.info(`Created default config at ${CONFIG_PATH}`)
}

let _config: NuxyConfig | null = null
let isWatching = false

export function loadConfig(): NuxyConfig {
  if (_config) return _config

  if (!fs.existsSync(CONFIG_DIR)) {
    log.info(`Creating config directory at ${CONFIG_DIR}`)
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }

  try {
    ensureUserThemes()
  } catch (e) {
    log.error('Failed to initialize user themes:', e)
  }

  const oldConfigPath = path.join(os.homedir(), '.nuxyconfig')
  if (fs.existsSync(oldConfigPath)) {
    log.info(
      `Found old config at ${oldConfigPath} — migrating to ${CONFIG_PATH}`
    )
    try {
      const rawOld = fs.readFileSync(oldConfigPath, 'utf-8')
      fs.writeFileSync(CONFIG_PATH, rawOld, 'utf-8')
      fs.unlinkSync(oldConfigPath)
    } catch (err) {
      log.error(`Failed to migrate old config:`, err)
    }
  }

  function watchConfig() {
    if (isWatching) return
    isWatching = true
    try {
      fs.watch(CONFIG_DIR, (eventType, filename) => {
        if (filename === 'nuxyconfig') {
          log.info('nuxyconfig changed on disk — reloading config.')
          try {
            reloadConfig()
            void import('../window/runtime.js').then(({ applyConfigToWindow }) =>
              import('../window/manager.js').then(({ getMainWindow }) => {
                const win = getMainWindow()
                if (win) applyConfigToWindow(win)
              })
            )
          } catch (e) {
            log.error('Failed to reload config on file change:', e)
          }
        }
      })
    } catch (err) {
      log.error('Failed to watch config directory:', err)
    }
  }

  if (!fs.existsSync(CONFIG_PATH)) {
    log.info(`No config found at ${CONFIG_PATH} — writing defaults.`)
    writeDefaultConfig()
    _config = { ...DEFAULTS }
    watchConfig()
    return _config
  }

  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
    const parsed = parseConfig(raw)
    _config = normalizeConfig({ ...DEFAULTS, ...parsed })
    log.info(`Config loaded from ${CONFIG_PATH}`, _config)
  } catch (err) {
    log.error(`Failed to read config — falling back to defaults.`, err)
    _config = { ...DEFAULTS }
  }

  watchConfig()
  return _config
}

export function reloadConfig(): NuxyConfig {
  _config = null
  return loadConfig()
}

function normalizeConfig(cfg: NuxyConfig): NuxyConfig {
  return {
    ...cfg,
    windowWidth:
      Number.isFinite(cfg.windowWidth) && cfg.windowWidth >= 200
        ? cfg.windowWidth
        : DEFAULTS.windowWidth,
    windowMaxHeight:
      Number.isFinite(cfg.windowMaxHeight) && cfg.windowMaxHeight >= 48
        ? cfg.windowMaxHeight
        : DEFAULTS.windowMaxHeight,
    opacity: Math.min(1, Math.max(0, cfg.opacity ?? DEFAULTS.opacity))
  }
}

export function getConfig(): NuxyConfig {
  if (!_config) return loadConfig()
  return _config
}

export function getWindowPosition(
  winWidth: number,
  winHeight: number,
  displayBounds: { x: number; y: number; width: number; height: number }
): { x: number; y: number } {
  const cfg = getConfig()
  const { x: dx, y: dy, width: dw, height: dh } = displayBounds

  let targetX = Math.round(dx + (dw - winWidth) / 2)
  let targetY = Math.round(dy + (dh - winHeight) / 2)

  if (cfg.windowPosition) {
    const parts = cfg.windowPosition.split(/[\s,]+/)
    if (parts.length >= 2) {
      targetX = Math.round(dx + parseCoordinate(parts[0], dw, winWidth))
      targetY = Math.round(dy + parseCoordinate(parts[1], dh, winHeight))
    } else if (parts.length === 1 && parts[0].trim().length > 0) {
      targetX = Math.round(dx + parseCoordinate(parts[0], dw, winWidth))
    }
  }

  return { x: targetX, y: targetY }
}

function parseCoordinate(
  val: string,
  displayLength: number,
  winLength: number
): number {
  val = val.trim().toLowerCase()

  if (val === 'center') {
    return Math.round((displayLength - winLength) / 2)
  }

  if (val.endsWith('px')) {
    const px = parseFloat(val)
    return isNaN(px)
      ? Math.round((displayLength - winLength) / 2)
      : Math.round(px)
  }

  if (val.endsWith('%')) {
    const pct = parseFloat(val)
    if (!isNaN(pct)) {
      const ratio = pct / 100
      return Math.round(displayLength * ratio - winLength / 2)
    }
  }

  if (val.includes('/')) {
    const parts = val.split('/')
    if (parts.length === 2) {
      const num = parseFloat(parts[0])
      const den = parseFloat(parts[1])
      if (!isNaN(num) && !isNaN(den) && den !== 0) {
        const ratio = num / den
        return Math.round(displayLength * ratio - winLength / 2)
      }
    }
  }

  const ratio = parseFloat(val)
  if (!isNaN(ratio)) {
    if (ratio >= 0 && ratio <= 1) {
      return Math.round(displayLength * ratio - winLength / 2)
    }
    return Math.round(ratio)
  }

  return Math.round((displayLength - winLength) / 2)
}
