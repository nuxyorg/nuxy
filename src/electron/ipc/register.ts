/// <reference types="vite/client" />
import { ipcMain, BrowserWindow, screen, app } from 'electron'
import { loadedExtensions } from '../extensions/scanner.js'
import { getDisplayName, isBootstrapExtension } from '../extensions/registry.js'
import { getOrCreateSpring } from '../window/spring.js'
import { kernelLogger } from '@nuxy/core'
import type { IpcResult } from '@nuxy/core'
import { getConfig, reloadConfig } from '../config/nuxyconfig.js'
import { loadTheme, listFileThemeNames } from '../themes/install.js'
import { listExtensionThemeNames } from '../themes/extension-themes.js'
import { getIcon, listIconPacks } from '../icons/registry.js'
import { positionWindowOnDisplay, applyConfigToWindow } from '../window/runtime.js'
import { validateExtInvokeArgs, validateWindowResize } from './validate.js'
import { invokeWorker } from './worker-invoke.js'

const log = kernelLogger.child('IPC')

const MIN_CONTENT_WIDTH = 200
const MIN_CONTENT_HEIGHT = 48

let dragOffset: { x: number; y: number } | null = null

function listByType(type: 'tool' | 'provider' | 'orchestrator'): typeof loadedExtensions {
  return loadedExtensions
    .filter((ext) => ext.manifest.type === type && !isBootstrapExtension(ext))
    .map((ext) => ({
      ...ext,
      manifest: { ...ext.manifest, name: getDisplayName(ext) },
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

      if (id === 'kernel') {
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

        if (ch === 'applyWindowSettings') {
          // Settings extension calls this after saving to apply changes immediately
          reloadConfig()
          const win = BrowserWindow.getAllWindows()[0]
          if (win && !win.isDestroyed()) applyConfigToWindow(win)
          return { success: true }
        }

        if (ch === 'getTheme') {
          // Theme is managed by the settings extension; default to 'dark' here
          return { success: true, data: loadTheme('dark') }
        }

        if (ch === 'getThemeByName') {
          const args = pl as { name?: string } | undefined
          const name = args?.name
          if (!name || typeof name !== 'string') {
            return { success: false, error: 'Missing theme name', code: 'INVALID_ARGS' }
          }
          return { success: true, data: loadTheme(name) }
        }

        if (ch === 'listThemes') {
          const extNames = listExtensionThemeNames()
          const fileNames = listFileThemeNames()
          const all = [...new Set([...extNames, ...fileNames])]
          return { success: true, data: all }
        }

        if (ch === 'getIcon') {
          const args = pl as { name?: string; pack?: string } | undefined
          const name = args?.name
          if (!name || typeof name !== 'string') {
            return { success: false, error: 'Missing icon name', code: 'INVALID_ARGS' }
          }
          const svg = getIcon(name, args?.pack)
          if (!svg) {
            return { success: false, error: `Icon not found: ${name}`, code: 'NOT_FOUND' }
          }
          return { success: true, data: svg }
        }

        if (ch === 'listIconPacks') {
          return { success: true, data: listIconPacks() }
        }
      }

      return invokeWorker(id, ch, pl)
    }
  )

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
