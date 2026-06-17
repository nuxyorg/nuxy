import { app, protocol, BrowserWindow } from 'electron'
import net from 'net'
import os from 'os'
import fs from 'fs'
import path from 'path'

import {
  createMainWindow,
  getMainWindow,
  isPreloadsLoaded,
  tryHideMainWindow,
} from '../window/manager.js'
import { applyConfigToWindow, positionWindowOnDisplay } from '../window/runtime.js'
import { registerProtocols } from '../protocol/register.js'
import { registerIpc } from '../ipc/register.js'
import { scanExtensions } from '../extensions/scanner.js'
import { reloadConfig, setSettingsReloadCallback } from '../config/nuxyconfig.js'
import { kernelLogger } from '@nuxyorg/core'
import { platformId, getNowPlaying } from '../media/index.js'

// Linux: disable Vulkan (breaks on Wayland). Do not force X11 or disable GPU by default —
// both break transparent windows on Wayland desktops.
if (process.platform === 'linux') {
  const platform = process.env.NUXY_OZONE_PLATFORM?.trim()
  if (platform === 'x11' || platform === 'wayland') {
    app.commandLine.appendSwitch('ozone-platform', platform)
  }
  app.commandLine.appendSwitch('disable-features', 'Vulkan')

  if (process.env.NUXY_NO_GPU === '1') {
    app.disableHardwareAcceleration()
  }
}

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

    if (!isPreloadsLoaded()) {
      log.warn('Ignoring second-instance show because preloads are not fully loaded yet.')
      return
    }

    const win = getMainWindow() ?? BrowserWindow.getAllWindows()[0]
    if (win && !win.isDestroyed()) {
      applyConfigToWindow(win)

      const wasVisible = win.isVisible()
      if (!wasVisible) {
        positionWindowOnDisplay(win)
        win.show() // 'show' event in manager.ts sends window:show
      } else {
        positionWindowOnDisplay(win)
      }

      if (win.isMinimized()) win.restore()
      win.focus()
      if (wasVisible) win.webContents.send('window:show')
    }
  })

  setSettingsReloadCallback(async () => {
    const win = getMainWindow() ?? BrowserWindow.getAllWindows()[0]
    if (win && !win.isDestroyed()) applyConfigToWindow(win)
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

    const socketPath = process.env.NUXY_SOCKET_PATH || path.join(os.tmpdir(), 'nuxy.sock')
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

        if (!isPreloadsLoaded()) {
          log.warn(`Ignoring socket command "${cmd}" because preloads are not fully loaded yet.`)
          return
        }

        if (cmd === 'toggle') {
          if (win.isVisible()) {
            tryHideMainWindow('socket-toggle', () => win.hide())
          } else {
            applyConfigToWindow(win)
            positionWindowOnDisplay(win)
            win.show() // 'show' event in manager.ts sends window:show
            if (win.isMinimized()) win.restore()
            win.focus()
          }
        } else if (cmd === 'show') {
          applyConfigToWindow(win)
          const wasVisible = win.isVisible()
          if (!wasVisible) {
            positionWindowOnDisplay(win)
            win.show() // 'show' event in manager.ts sends window:show
          } else {
            positionWindowOnDisplay(win)
          }
          if (win.isMinimized()) win.restore()
          win.focus()
          if (wasVisible) win.webContents.send('window:show')
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
