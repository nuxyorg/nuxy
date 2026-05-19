import { BrowserWindow } from 'electron'
import { kernelLogger } from '@nuxy/core'

const log = kernelLogger.child('Spring')

export interface SpringConfig {
  stiffness: number
  damping: number
  restThreshold: number
  intervalMs: number
}

const DEFAULTS: SpringConfig = {
  stiffness: 0.14,
  damping: 0.3,
  restThreshold: 0.5,
  intervalMs: 4
}

export const CRITICAL_DAMPING: Partial<SpringConfig> = {
  stiffness: 0.14,
  damping: 0.88
}

interface State {
  w: number
  h: number
  vw: number
  vh: number
  tw: number
  th: number
}

export class WindowSpringController {
  private win: BrowserWindow
  private cfg: SpringConfig
  private s: State
  private timer: NodeJS.Timeout | null = null

  constructor(win: BrowserWindow, config: Partial<SpringConfig> = {}) {
    this.win = win
    this.cfg = { ...DEFAULTS, ...config }
    const [cw, ch] = win.getContentSize()
    this.s = {
      w: cw,
      h: ch,
      vw: 0,
      vh: 0,
      tw: cw,
      th: ch
    }
  }

  setTarget(target: { width?: number; height?: number }): void {
    if (target.width !== undefined) this.s.tw = target.width
    if (target.height !== undefined) this.s.th = target.height
    this._start()
  }

  syncState(): void {
    if (this.win.isDestroyed()) return
    this._stop()
    const [cw, ch] = this.win.getContentSize()
    this.s.w = cw
    this.s.h = ch
    this.s.tw = cw
    this.s.th = ch
    this.s.vw = 0
    this.s.vh = 0
  }

  snapToTarget(): void {
    const s = this.s
    s.w = s.tw
    s.h = s.th
    s.vw = 0
    s.vh = 0
    this._stop()
    if (!this.win.isDestroyed()) {
      this._applyFrame()
      log.info(`Content size after snapToTarget:`, this.win.getContentSize())
    }
  }

  pause(): void {
    this._stop()
  }

  resume(): void {
    const s = this.s
    const moving =
      Math.abs(s.tw - s.w) >= this.cfg.restThreshold ||
      Math.abs(s.th - s.h) >= this.cfg.restThreshold
    if (moving) this._start()
  }

  isAnimating(): boolean {
    return this.timer !== null
  }

  destroy(): void {
    this._stop()
  }

  private _start(): void {
    if (this.timer !== null) return
    this.timer = setInterval(() => this._tick(), this.cfg.intervalMs)
  }

  private _stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private _tick(): void {
    if (this.win.isDestroyed()) {
      this._stop()
      return
    }

    const { stiffness: sWH, damping: d } = this.cfg
    const s = this.s

    s.vw = (s.vw + (s.tw - s.w) * sWH) * d
    s.vh = (s.vh + (s.th - s.h) * sWH) * d
    s.w += s.vw
    s.h += s.vh

    const r = this.cfg.restThreshold
    const atRest =
      Math.abs(s.tw - s.w) < r &&
      Math.abs(s.th - s.h) < r &&
      Math.abs(s.vw) < 0.5 &&
      Math.abs(s.vh) < 0.5

    if (atRest) {
      s.w = s.tw
      s.h = s.th
      s.vw = 0
      s.vh = 0
      this._applyFrame()
      this._stop()
      log.silly(`Spring at rest: ${Math.round(s.w)}x${Math.round(s.h)}`)
      return
    }

    this._applyFrame()
  }

  private _applyFrame(): void {
    if (this.win.isDestroyed()) return
    const s = this.s
    this.win.setContentSize(
      Math.max(1, Math.round(s.w)),
      Math.max(1, Math.round(s.h))
    )
  }
}

const registry = new WeakMap<BrowserWindow, WindowSpringController>()

export function getOrCreateSpring(
  win: BrowserWindow,
  config?: Partial<SpringConfig>
): WindowSpringController {
  let ctrl = registry.get(win)
  if (!ctrl) {
    ctrl = new WindowSpringController(win, config)
    registry.set(win, ctrl)
    win.once('closed', () => {
      ctrl!.destroy()
      registry.delete(win)
    })
  }
  return ctrl
}
