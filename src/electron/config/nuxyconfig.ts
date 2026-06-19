// fallow-ignore-file code-duplication
import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import { kernelLogger } from '@nuxyorg/core'
import { DATA_DIR, CONFIG_DIR } from './paths.js'

const log = kernelLogger.child('NuxyConfig')

export type EscAction = 'hide' | 'minimize' | 'quit' | 'none'
export type BackgroundBehavior = 'reset-on-show' | 'resume-session'

export interface NuxyConfig {
  escAction: EscAction
  blurAction: EscAction
  backgroundBehavior: BackgroundBehavior
  windowWidth: number
  windowMaxHeight: number
  alwaysOnTop: boolean
  opacity: number
  showInTaskbar: boolean
  showOnStartup: boolean
  windowPosition?: string
  theme?: string
  zoom?: string
  font?: string
  extensions: Record<string, Record<string, string>>
}

const DEFAULTS: NuxyConfig = {
  escAction: 'hide',
  blurAction: 'hide',
  backgroundBehavior: 'reset-on-show',
  windowWidth: 800,
  windowMaxHeight: 600,
  alwaysOnTop: false,
  opacity: 1,
  showInTaskbar: false,
  showOnStartup: false,
  windowPosition: '1/2, 1/2',
  theme: 'dark',
  zoom: '100%',
  font: 'system',
  extensions: {},
}

/** Path to the settings.json written by the settings extension. */
const SETTINGS_JSON_PATH = path.join(DATA_DIR, 'com.nuxy.settings', 'settings.json')

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

function parseSettingsFields(parsed: Record<string, unknown>): Partial<NuxyConfig> {
  const result: Partial<NuxyConfig> = {}
  if (['hide', 'minimize', 'quit', 'none'].includes(parsed.escAction as string))
    result.escAction = parsed.escAction as EscAction
  if (['hide', 'minimize', 'quit', 'none'].includes(parsed.blurAction as string))
    result.blurAction = parsed.blurAction as EscAction
  if (['reset-on-show', 'resume-session'].includes(parsed.backgroundBehavior as string))
    result.backgroundBehavior = parsed.backgroundBehavior as BackgroundBehavior
  const windowWidth = toFiniteNumber(parsed.windowWidth)
  if (windowWidth !== undefined && windowWidth >= 200) result.windowWidth = windowWidth
  const windowMaxHeight = toFiniteNumber(parsed.windowMaxHeight)
  if (windowMaxHeight !== undefined && windowMaxHeight >= 48)
    result.windowMaxHeight = windowMaxHeight
  if (typeof parsed.alwaysOnTop === 'boolean') result.alwaysOnTop = parsed.alwaysOnTop
  const opacity = toFiniteNumber(parsed.opacity)
  if (opacity !== undefined) result.opacity = Math.min(1, Math.max(0, opacity))
  if (typeof parsed.showInTaskbar === 'boolean') result.showInTaskbar = parsed.showInTaskbar
  if (typeof parsed.showOnStartup === 'boolean') result.showOnStartup = parsed.showOnStartup
  if (typeof parsed.windowPosition === 'string') result.windowPosition = parsed.windowPosition
  if (typeof parsed.theme === 'string') result.theme = parsed.theme
  if (typeof parsed.zoom === 'string') result.zoom = parsed.zoom
  if (typeof parsed.font === 'string') result.font = parsed.font
  return result
}

function readSettingsJson(): Partial<NuxyConfig> {
  try {
    if (!fs.existsSync(SETTINGS_JSON_PATH)) return {}
    const raw = fs.readFileSync(SETTINGS_JSON_PATH, 'utf-8')
    return parseSettingsFields(JSON.parse(raw))
  } catch (err) {
    log.warn('Failed to read settings.json — using defaults.', err)
    return {}
  }
}

let _config: NuxyConfig | null = null
let isWatching = false
let _onSettingsReloaded: (() => Promise<void>) | null = null

/** Register a callback invoked after settings.json changes and config reloads. */
export function setSettingsReloadCallback(cb: () => Promise<void>): void {
  _onSettingsReloaded = cb
}

function loadConfig(): NuxyConfig {
  if (_config) return _config

  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }

  function watchSettings() {
    if (isWatching) return
    isWatching = true
    const settingsDir = path.dirname(SETTINGS_JSON_PATH)
    if (!fs.existsSync(settingsDir)) return
    try {
      fs.watch(settingsDir, (_, filename) => {
        if (filename === 'settings.json') {
          log.info('settings.json changed — reloading config.')
          void (async () => {
            try {
              await reloadConfigAsync()
              await _onSettingsReloaded?.()
            } catch (e) {
              log.error('Failed to reload config on settings.json change:', e)
            }
          })()
        }
      })
    } catch (err) {
      log.error('Failed to watch settings directory:', err)
    }
  }

  const fromSettings = readSettingsJson()
  _config = { ...DEFAULTS, ...fromSettings, extensions: {} }
  log.info('Config loaded from settings.json', _config)

  watchSettings()
  return _config
}

export function reloadConfig(): NuxyConfig {
  _config = null
  return loadConfig()
}

async function readSettingsJsonAsync(): Promise<Partial<NuxyConfig>> {
  try {
    const raw = await fsPromises.readFile(SETTINGS_JSON_PATH, 'utf-8')
    return parseSettingsFields(JSON.parse(raw))
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      log.warn('Failed to read settings.json — using defaults.', err)
    }
    return {}
  }
}

async function reloadConfigAsync(): Promise<NuxyConfig> {
  const fromSettings = await readSettingsJsonAsync()
  _config = { ...DEFAULTS, ...fromSettings, extensions: {} }
  log.info('Config reloaded from settings.json', _config)
  return _config
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

function parseCoordinate(val: string, displayLength: number, winLength: number): number {
  val = val.trim().toLowerCase()

  if (val === 'center') {
    return Math.round((displayLength - winLength) / 2)
  }

  if (val.endsWith('px')) {
    const px = parseFloat(val)
    return isNaN(px) ? Math.round((displayLength - winLength) / 2) : Math.round(px)
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
