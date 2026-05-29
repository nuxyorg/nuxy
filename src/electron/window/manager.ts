import { app, BrowserWindow, screen } from 'electron'
import path from 'path'
import { getConfig } from '../config/nuxyconfig.js'
import { applyConfigToWindow, positionWindowOnDisplay } from './runtime.js'
import { kernelLogger } from '@nuxy/core'

const log = kernelLogger.child('Window')

let mainWindow: BrowserWindow | null = null

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    log.info('Destroying existing main window before recreate')
    mainWindow.destroy()
    mainWindow = null
  }

  const cfg = getConfig()
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
      preload: path.join(app.getAppPath(), 'dist-electron', 'preload.mjs'),
    },
  })

  applyConfigToWindow(mainWindow)

  mainWindow.on('show', () => {
    positionWindowOnDisplay(mainWindow!)
    mainWindow?.webContents.send('window-show')
  })

  mainWindow.on('blur', () => {
    const { blurAction } = getConfig()
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

  if (cfg.showOnStartup) {
    try {
      const cursorPoint = screen.getCursorScreenPoint()
      const display = screen.getDisplayNearestPoint(cursorPoint)
      log.info(
        `Showing main window on display ${display.id} near cursor (${cursorPoint.x}, ${cursorPoint.y})`
      )
    } catch (err) {
      log.warn('Could not determine display before show', err)
    }
    positionWindowOnDisplay(mainWindow)
    mainWindow.show()
  }

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'))
  }
}
