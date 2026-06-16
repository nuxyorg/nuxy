import { ipcMain, app, screen, BrowserWindow } from 'electron'
import { kernelLogger } from '@nuxyorg/core'
import { getConfig } from '../config/nuxyconfig.js'
import { positionWindowOnDisplay } from '../window/runtime.js'
import { getOrCreateSpring } from '../window/spring.js'
import { onPreloadsLoaded, onRendererReady, setBlurSuppressed } from '../window/manager.js'

const log = kernelLogger.child('WindowChannels')

let dragOffset: { x: number; y: number } | null = null

export function registerWindowChannels(): void {
  ipcMain.on('window:resize', (_event, width: unknown, height: unknown) => {
    log.silly('window:resize ignored because window is a transparent full-screen overlay', {
      width,
      height,
    })
  })

  ipcMain.on('window:center', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) positionWindowOnDisplay(win)
  })

  ipcMain.on('window:drag-start', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || win.isDestroyed()) return

    const cursor = screen.getCursorScreenPoint()
    const [wx, wy] = win.getPosition()
    dragOffset = { x: wx - cursor.x, y: wy - cursor.y }
    getOrCreateSpring(win).pause()
  })

  ipcMain.on('window:drag-move', (event) => {
    if (!dragOffset) return
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || win.isDestroyed()) return

    const cursor = screen.getCursorScreenPoint()
    win.setPosition(Math.round(cursor.x + dragOffset.x), Math.round(cursor.y + dragOffset.y))
  })

  ipcMain.on('window:drag-end', (event) => {
    if (!dragOffset) return
    dragOffset = null
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || win.isDestroyed()) return
    getOrCreateSpring(win).syncState()
  })

  ipcMain.on('window:hide', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) win.hide()
  })

  ipcMain.on('window:quit', () => {
    app.quit()
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

  ipcMain.on('window:preloads-loaded', () => {
    // log.info(`[FLASH-DEBUG] window:preloads-loaded received at ${Date.now()}`)
    onPreloadsLoaded()
  })

  ipcMain.on('window:ready', () => {
    // log.info(`[FLASH-DEBUG] window:ready received at ${Date.now()}`)
    onRendererReady()
  })

  ipcMain.on('window:set-blur-suppressed', (_event, suppressed: unknown) => {
    setBlurSuppressed(suppressed === true)
    log.silly('blur suppression updated', { suppressed: suppressed === true })
  })
}
