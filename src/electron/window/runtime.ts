import { BrowserWindow, screen } from 'electron'
import { getConfig } from '../config/nuxyconfig.js'
import { kernelLogger } from '@nuxy/core'

const log = kernelLogger.child('ConfigRuntime')

export function applyConfigToWindow(win: BrowserWindow): void {
  if (win.isDestroyed()) return
  const cfg = getConfig()
  win.setAlwaysOnTop(cfg.alwaysOnTop)
  win.setOpacity(cfg.opacity)
  win.setSkipTaskbar(!cfg.showInTaskbar)
  log.silly('Applied config to window', {
    alwaysOnTop: cfg.alwaysOnTop,
    opacity: cfg.opacity,
    showInTaskbar: cfg.showInTaskbar
  })
}

export function positionWindowOnDisplay(win: BrowserWindow): void {
  if (win.isDestroyed()) return
  try {
    const cursorPoint = screen.getCursorScreenPoint()
    const display = screen.getDisplayNearestPoint(cursorPoint)
    log.silly(`Positioned window on display ${display.id}`)
  } catch (err) {
    log.warn('Failed to position window', err)
  }
}
