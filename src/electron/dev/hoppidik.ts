/// <reference types="vite/client" />
import { ipcMain, BrowserWindow } from 'electron'
import { getOrCreateSpring } from '../spring.js'
import { kernelLogger } from '@nuxy/core'

const log = kernelLogger.child('Hoppidik')

let hoppidikInterval: NodeJS.Timeout | null = null

globalThis.isHoppidikActive = () => hoppidikInterval !== null
globalThis.clearHoppidik = () => {
  if (hoppidikInterval) {
    clearInterval(hoppidikInterval)
    hoppidikInterval = null
    log.info('Cleared hoppidikInterval')
  }
}

export function registerHoppidikHandlers() {
  // ── window:startHoppidik ──────────────────────────────────────────────────────
  ipcMain.on('window:startHoppidik', (event) => {
    log.info('window:startHoppidik received')
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) {
      log.warn('window:startHoppidik — no BrowserWindow for sender')
      return
    }

    if (hoppidikInterval) return

    const spring = getOrCreateSpring(win)

    const hop = () => {
      try {
        if (win.isDestroyed()) {
          if (hoppidikInterval) {
            clearInterval(hoppidikInterval)
            hoppidikInterval = null
          }
          return
        }

        // Random height between 150 and 700
        const randomHeight = Math.floor(Math.random() * (700 - 150 + 1)) + 150
        spring.setTarget({ height: randomHeight })
      } catch (e) {
        log.error('Hoppidik bounce calculation failed', e)
      }
    }

    hop()
    hoppidikInterval = setInterval(hop, 800)
  })

  // ── window:stopHoppidik ───────────────────────────────────────────────────────
  ipcMain.on('window:stopHoppidik', (event) => {
    log.info('window:stopHoppidik received')
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) {
      log.warn('window:stopHoppidik — no BrowserWindow for sender')
      return
    }

    if (hoppidikInterval) {
      clearInterval(hoppidikInterval)
      hoppidikInterval = null
      log.info('Stopped hoppidik interval')
    }

    log.info('Hoppidik stopped')
  })
}
