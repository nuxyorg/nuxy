import { app, protocol, BrowserWindow } from 'electron'

import { createMainWindow, getMainWindow } from './window.js'
import { applyConfigToWindow, positionWindowOnDisplay } from './config-runtime.js'
import { registerProtocols } from './protocol.js'
import { registerIpc } from './ipc.js'
import { scanExtensions } from './scanner.js'
import { reloadConfig } from './nuxyconfig.js'
import { kernelLogger } from '@nuxy/core'

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

    const win = getMainWindow() ?? BrowserWindow.getAllWindows()[0]
    if (win && !win.isDestroyed()) {
      applyConfigToWindow(win)

      if (!win.isVisible()) {
        positionWindowOnDisplay(win)
        win.show()
      } else {
        positionWindowOnDisplay(win)
      }

      if (win.isMinimized()) win.restore()
      win.focus()
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
