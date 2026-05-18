/// <reference types="vite/client" />
import { ipcMain, BrowserWindow, screen, app } from 'electron'
import { activeWorkers } from './worker/spawn.js'
import { loadedExtensions } from './registry.js'
import { getOrCreateSpring } from './spring.js'
import { kernelLogger } from '@nuxy/core'
import type { IpcResult } from '@nuxy/core'
import { getConfig } from './nuxyconfig.js'
import { loadTheme } from './themes/index.js'
import { positionWindowOnDisplay } from './config-runtime.js'
import { validateExtInvokeArgs, validateWindowResize } from './ipc-validate.js'

const log = kernelLogger.child('IPC')

const MIN_CONTENT_WIDTH = 200
const MIN_CONTENT_HEIGHT = 48
const EXT_INVOKE_TIMEOUT_MS = 15_000

let dragOffset: { x: number; y: number } | null = null

function invokeWorker(
  extId: string,
  channel: string,
  payload: unknown
): Promise<IpcResult> {
  const worker = activeWorkers.get(extId)
  if (!worker) {
    return Promise.resolve({ success: false, error: 'Worker not found' })
  }

  return new Promise((resolve) => {
    const msgId = Math.random().toString(36).slice(2)
    let settled = false

    const finish = (result: IpcResult) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      worker.off('message', listener)
      resolve(result)
    }

    const timer = setTimeout(() => {
      log.warn(`ext:invoke timeout for "${extId}" channel "${channel}"`)
      finish({
        success: false,
        error: 'Worker did not respond in time',
        code: 'TIMEOUT'
      })
    }, EXT_INVOKE_TIMEOUT_MS)

    const listener = (msg: {
      id?: string
      error?: string
      result?: unknown
    }) => {
      if (msg.id !== msgId) return
      if (msg.error) {
        log.warn(`Worker "${extId}" error on "${channel}"`, msg.error)
        finish({ success: false, error: msg.error })
      } else {
        finish({ success: true, data: msg.result })
      }
    }

    worker.on('message', listener)
    worker.postMessage({ id: msgId, channel, payload })
  })
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
          const tools = loadedExtensions.filter(
            (ext) => ext.manifest.type === 'tool'
          )
          return { success: true, data: tools }
        }

        if (ch === 'listProviders') {
          const providers = loadedExtensions.filter(
            (ext) => ext.manifest.type === 'provider'
          )
          return { success: true, data: providers }
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
