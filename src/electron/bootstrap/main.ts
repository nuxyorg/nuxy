import { app, protocol, BrowserWindow } from 'electron'
import net from 'net'
import os from 'os'
import fs from 'fs'
import path from 'path'

import { createMainWindow, getMainWindow } from '../window/manager.js'
import { applyConfigToWindow, positionWindowOnDisplay } from '../window/runtime.js'
import { registerProtocols } from '../protocol/register.js'
import { registerIpc } from '../ipc/register.js'
import { scanExtensions } from '../extensions/scanner.js'
import { reloadConfig } from '../config/nuxyconfig.js'
import { kernelLogger } from '@nuxy/core'
import { platformId, getNowPlaying } from '../media/index.js'

// Expose media functions on globalThis for E2E tests
;(globalThis as any).__test_media = { platformId, getNowPlaying }

const log = kernelLogger.child('App')

process.on('uncaughtException', (err: any) => {
  if (err?.code === 'EIO' || err?.message === 'write EIO') {
    return
  }
  log.error('Uncaught Exception:', err)
  if (process.env.NODE_ENV !== 'development') {
    app.quit()
  }
})

const gotTheLock = app.requestSingleInstanceLock()

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'nuxy-ext',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      bypassCSP: true,
      corsEnabled: true,
    },
  },
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
      win.webContents.send('window:show')
    }
  })

  app.whenReady().then(async () => {
    log.info('Electron app ready. Bootstrapping kernel...')

    log.silly('Registering custom protocols (nuxy-ext)')
    registerProtocols()

    log.silly('Registering IPC handlers')
    registerIpc()

    log.info('Creating main window...')
    createMainWindow()

    log.info('Scanning extensions...')
    await scanExtensions()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        log.info('App activated with no windows — creating main window.')
        createMainWindow()
      }
    })

    log.info('Kernel bootstrap complete.')

    const socketPath = path.join(os.tmpdir(), 'nuxy.sock')
    if (fs.existsSync(socketPath)) {
      try {
        fs.unlinkSync(socketPath)
      } catch (e) {
        log.error('Failed to unlink existing socket:', e)
      }
    }

    const server = net.createServer((socket) => {
      socket.on('data', (data) => {
        const cmd = data.toString().trim()
        log.info(`Received socket command: ${cmd}`)

        const win = getMainWindow() ?? BrowserWindow.getAllWindows()[0]
        if (!win || win.isDestroyed()) return

        if (cmd === 'toggle') {
          if (win.isVisible()) {
            win.hide()
          } else {
            applyConfigToWindow(win)
            positionWindowOnDisplay(win)
            win.show()
            if (win.isMinimized()) win.restore()
            win.focus()
            win.webContents.send('window:show')
          }
        } else if (cmd === 'show') {
          applyConfigToWindow(win)
          if (!win.isVisible()) {
            positionWindowOnDisplay(win)
            win.show()
          } else {
            positionWindowOnDisplay(win)
          }
          if (win.isMinimized()) win.restore()
          win.focus()
          win.webContents.send('window:show')
        }
      })
    })

    server.listen(socketPath, () => {
      log.info(`Listening on UNIX socket at ${socketPath}`)
    })
  })

  app.on('window-all-closed', () => {
    log.info('All windows closed.')
    if (process.platform !== 'darwin') {
      log.silly('Platform is not darwin — quitting app.')
      app.quit()
    }
  })
}
