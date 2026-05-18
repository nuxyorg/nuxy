import { BrowserWindow, screen } from 'electron'
import path from 'path'
import { getConfig } from './nuxyconfig.js'
import { kernelLogger } from '../../../packages/core/src/logger.js'

const log = kernelLogger.child('Window')

let mainWindow: BrowserWindow | null = null

export function createMainWindow() {
  const cfg = getConfig()

  log.info('Creating main window with config', cfg)

  mainWindow = new BrowserWindow({
    width: cfg.windowWidth,
    height: 0,
    transparent: false,
    backgroundColor: '#141414',
    frame: false,
    alwaysOnTop: cfg.alwaysOnTop,
    skipTaskbar: !cfg.showInTaskbar,
    opacity: cfg.opacity,
    show: false, // position first, then show — avoids flicker
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(import.meta.dirname, 'preload.mjs')
    }
  })

  mainWindow.on('show', () => {
    mainWindow?.webContents.send('window-show')
  })

  if (!cfg.startHidden) {
    try {
      const cursorPoint = screen.getCursorScreenPoint()
      const display = screen.getDisplayNearestPoint(cursorPoint)
      log.info(
        `Showing main window on display ${display.id} near cursor (${cursorPoint.x}, ${cursorPoint.y})`
      )
    } catch (err) {
      log.warn('Could not determine screen display before show', err)
    }
    mainWindow.show()
  }

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(import.meta.dirname, '../dist/index.html'))
  }
}

export function getMainWindow() {
  return mainWindow
}
