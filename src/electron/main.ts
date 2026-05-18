import { app, protocol, BrowserWindow, screen } from 'electron'

import { createMainWindow } from './window.js'
import { registerProtocols } from './protocol.js'
import { registerIpc } from './ipc.js'
import { scanExtensions } from './scanner.js'
import { reloadConfig } from './nuxyconfig.js'
import { kernelLogger } from '../../../packages/core/src/logger.js'

const log = kernelLogger.child('App')

const gotTheLock = app.requestSingleInstanceLock()

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'nuxy-ext',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      bypassCSP: true,
      corsEnabled: true
    }
  }
])

if (!gotTheLock) {
  log.warn('Another instance is already running — quitting.')
  app.quit()
} else {
  app.on('second-instance', () => {
    log.info('Second instance attempted — focusing existing window.')

    try {
      reloadConfig()
    } catch (err) {
      log.error('Failed to reload config on second-instance:', err)
    }

    const wins = BrowserWindow.getAllWindows()
    if (wins.length > 0) {
      const win = wins[0]

      try {
        const cursorPoint = screen.getCursorScreenPoint()
        const display = screen.getDisplayNearestPoint(cursorPoint)
        if (!win.isVisible()) {
          log.info(
            `Showing window on display ${display.id} near cursor coordinates (${cursorPoint.x}, ${cursorPoint.y})`
          )
          win.show()
        } else {
          log.info(
            `Window is already visible. Focusing window on display ${display.id} near cursor coordinates (${cursorPoint.x}, ${cursorPoint.y})`
          )
        }
      } catch (err) {
        log.warn(
          'Could not determine screen display before second-instance show/focus',
          err
        )
        if (!win.isVisible()) win.show()
      }

      if (win.isMinimized()) win.restore()
      win.focus()

      // Notify the frontend that the window is being opened/summoned
      win.webContents.send('window-show')
    }
  })

  app.whenReady().then(async () => {
    log.info('Electron app ready. Bootstrapping kernel...')

    log.silly('Registering custom protocols (nuxy-ext)')
    registerProtocols()

    log.silly('Registering IPC handlers')
    registerIpc()

    log.info('Scanning extensions...')
    await scanExtensions()

    log.info('Creating main window...')
    createMainWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        log.info('App activated with no windows — creating main window.')
        createMainWindow()
      }
    })

    log.info('Kernel bootstrap complete.')
  })

  app.on('window-all-closed', () => {
    log.info('All windows closed.')
    if (process.platform !== 'darwin') {
      log.silly('Platform is not darwin — quitting app.')
      app.quit()
    }
  })
}
