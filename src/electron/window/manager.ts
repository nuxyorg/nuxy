import { app, BrowserWindow } from 'electron'
import path from 'path'
import { getConfig } from '../config/nuxyconfig.js'
import { applyConfigToWindow, positionWindowOnDisplay } from './runtime.js'
import { resolvePreloadScriptPath } from './preload-path.js'
import { kernelLogger } from '@nuxyorg/core'

const log = kernelLogger.child('Window')

export type BlurSuppressSource = 'manifest' | 'tool'

let mainWindow: BrowserWindow | null = null
let readyToShowFired = false
let rendererReady = false
let showOnStartup = false
let manifestBlurSuppressed = false
let toolBlurSuppressed = false

export function setBlurSuppressed(suppressed: boolean, source: BlurSuppressSource = 'tool'): void {
  if (source === 'manifest') manifestBlurSuppressed = suppressed
  else toolBlurSuppressed = suppressed
}

/** Clears manifest-layer suppression only; tool-layer (e.g. notes edit mode) is untouched. */
export function clearBlurSuppressed(): void {
  manifestBlurSuppressed = false
}

export function isBlurSuppressed(): boolean {
  return manifestBlurSuppressed || toolBlurSuppressed
}

/** Hide only when blur suppression is inactive. */
export function tryHideMainWindow(reason: string, hide: () => void): void {
  if (isBlurSuppressed()) return
  hide()
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function onRendererReady(): void {
  // log.info(`[FLASH-DEBUG] onRendererReady. readyToShowFired=${readyToShowFired}`)
  rendererReady = true
  checkAndShow()
}

function checkAndShow() {
  if (readyToShowFired && rendererReady && mainWindow && !mainWindow.isDestroyed()) {
    if (showOnStartup && !mainWindow.isVisible()) {
      // log.info(`[FLASH-DEBUG] Showing window (ready-to-show and renderer ready) at ${Date.now()}`)
      positionWindowOnDisplay(mainWindow)
      mainWindow.show()
      mainWindow.webContents.send('window:show')
    }
  }
}

export function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    log.info('Destroying existing main window before recreate')
    mainWindow.destroy()
    mainWindow = null
  }

  readyToShowFired = false
  rendererReady = false

  const cfg = getConfig()
  showOnStartup = cfg.showOnStartup
  log.info('Creating main window', cfg)

  mainWindow = new BrowserWindow({
    width: cfg.windowWidth,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    hasShadow: false,
    alwaysOnTop: cfg.alwaysOnTop,
    skipTaskbar: !cfg.showInTaskbar,
    opacity: 1,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
      preload: resolvePreloadScriptPath(app.getAppPath()),
    },
  })

  applyConfigToWindow(mainWindow)

  mainWindow.once('ready-to-show', () => {
    // log.info(`[FLASH-DEBUG] ready-to-show fired at ${Date.now()}`)
    readyToShowFired = true
    checkAndShow()
  })

  mainWindow.on('show', () => {
    positionWindowOnDisplay(mainWindow!)
    mainWindow?.webContents.send('window:show')
  })

  mainWindow.on('blur', () => {
    const { blurAction } = getConfig()
    tryHideMainWindow('blur', () => {
      switch (blurAction) {
        case 'minimize':
          mainWindow?.minimize()
          break
        case 'quit':
          app.quit()
          break
        case 'none':
          break
        case 'hide':
        default:
          mainWindow?.hide()
          break
      }
    })
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'))
  }
}

let preloadsLoaded = false

export function isPreloadsLoaded(): boolean {
  return preloadsLoaded
}

export function onPreloadsLoaded(): void {
  preloadsLoaded = true
}
