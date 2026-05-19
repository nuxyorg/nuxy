/// <reference types="vite/client" />
import { ipcMain, BrowserWindow, screen, app } from 'electron'
import { loadedExtensions } from '../extensions/scanner.js'
import {
  getDisplayName,
  isBootstrapExtension
} from '../extensions/registry.js'
import { getOrCreateSpring } from '../window/spring.js'
import { kernelLogger } from '@nuxy/core'
import type { IpcResult } from '@nuxy/core'
import { getConfig } from '../config/nuxyconfig.js'
import { loadTheme } from '../themes/install.js'
import { positionWindowOnDisplay } from '../window/runtime.js'
import { validateExtInvokeArgs, validateWindowResize } from './validate.js'
import { invokeWorker } from './worker-invoke.js'

const log = kernelLogger.child('IPC')

const MIN_CONTENT_WIDTH = 200
const MIN_CONTENT_HEIGHT = 48

let dragOffset: { x: number; y: number } | null = null

function listByType(type: 'tool' | 'provider' | 'orchestrator') {
  return loadedExtensions
    .filter((ext) => ext.manifest.type === type && !isBootstrapExtension(ext))
    .map((ext) => ({
      ...ext,
      manifest: { ...ext.manifest, name: getDisplayName(ext) }
    }))
}

export function registerIpc() {
  log.info('Registering IPC handlers...')

  ipcMain.handle(
    'ext:invoke',
    async (_event, extId: unknown, channel: unknown, payload: unknown) => {
      const validated = validateExtInvokeArgs(extId, channel, payload)
      if (!validated.ok) return validated.result

      const { extId: id, channel: ch, payload: pl } = validated
      log.silly(`ext:invoke`, { extId: id, channel: ch, payload: pl })

      if (id === 'kernel' || id === 'core') {
        if (ch === 'listTools') {
          return { success: true, data: listByType('tool') }
        }

        if (ch === 'listProviders') {
          return { success: true, data: listByType('provider') }
        }

        if (ch === 'listOrchestrators') {
          return { success: true, data: listByType('orchestrator') }
        }

        if (ch === 'getConfig') {
          return { success: true, data: getConfig() }
        }

        if (ch === 'getTheme') {
          const cfg = getConfig()
          let themeName = cfg.theme || 'dark'
          if (themeName === 'system') {
            const { nativeTheme } = await import('electron')
            themeName = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
          }
          return { success: true, data: loadTheme(themeName) }
        }
      }

      return invokeWorker(id, ch, pl)
    }
  )

  ipcMain.on('window:resize', (event, width: unknown, height: unknown) => {
    const dims = validateWindowResize(width, height)
    if (!dims.ok) {
      log.warn('window:resize rejected — invalid dimensions', { width, height })
      return
    }

    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return

    const maxH = getConfig().windowMaxHeight
    const targetW = Math.max(MIN_CONTENT_WIDTH, Math.round(dims.width))
    const targetH = Math.min(
      maxH,
      Math.max(MIN_CONTENT_HEIGHT, Math.round(dims.height))
    )

    try {
      const [, ch] = win.getContentSize()
      const spring = getOrCreateSpring(win)
      spring.setTarget({ width: targetW, height: targetH })
      if (!win.isVisible() || ch < MIN_CONTENT_HEIGHT) {
        spring.snapToTarget()
      }
    } catch (error) {
      log.error('window:resize failed', error)
      win.setContentSize(targetW, targetH)
    }
  })

  ipcMain.on('window:center', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) positionWindowOnDisplay(win)
  })

  ipcMain.on('window:dragStart', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || win.isDestroyed()) return
    const cursor = screen.getCursorScreenPoint()
    const [wx, wy] = win.getPosition()
    dragOffset = { x: wx - cursor.x, y: wy - cursor.y }
    getOrCreateSpring(win).pause()
  })

  ipcMain.on('window:dragMove', (event) => {
    if (!dragOffset) return
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || win.isDestroyed()) return
    const cursor = screen.getCursorScreenPoint()
    win.setPosition(
      Math.round(cursor.x + dragOffset.x),
      Math.round(cursor.y + dragOffset.y)
    )
  })

  ipcMain.on('window:dragEnd', (event) => {
    if (!dragOffset) return
    dragOffset = null
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || win.isDestroyed()) return
    getOrCreateSpring(win).syncState()
  })

  ipcMain.on('window:hide', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      win.hide()
    }
  })

  ipcMain.on('window:esc', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    const { escAction } = getConfig()
    switch (escAction) {
      case 'minimize':
        win.minimize()
        break
      case 'quit':
        app.quit()
        break
      case 'none':
        break
      case 'hide':
      default:
        win.hide()
        break
    }
  })

  log.info('IPC handlers registered.')
}
