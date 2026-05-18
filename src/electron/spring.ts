import { BrowserWindow } from 'electron'
import { kernelLogger } from '../../../packages/core/src/logger.js'

const log = kernelLogger.child('Spring')

export interface SpringConfig {
  /** Spring stiffness for width/height resize (0–1). Higher = snappier. */
  stiffness: number
  /**
   * Per-tick velocity decay (0–1). Lower = more friction, faster stop.
   * ~0.80 = slight overshoot (alive feel).
   * ~0.88 = near-critical (no overshoot, clean).
   */
  damping: number
  /** Distance below which the spring is considered at rest (pixels). */
  restThreshold: number
  /** Tick interval in ms. 16 ≈ 60 fps. */
  intervalMs: number
}

const DEFAULTS: SpringConfig = {
  stiffness: 0.14,
  damping: 0.3,
  restThreshold: 0.5,
  intervalMs: 4
}

/** Preset: no overshoot, fastest convergence. */
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

  /**
   * Update the animation target. Safe to call at any time, including
   * mid-animation — velocity is preserved and the spring curves naturally.
   * Omitted axes keep their current target.
   */
  setTarget(target: { width?: number; height?: number }): void {
    if (target.width !== undefined) this.s.tw = target.width
    if (target.height !== undefined) this.s.th = target.height
    this._start()
  }

  /**
   * Sync internal spring state from the window's actual content size.
   * Call after an external resize so future animations start from the correct size.
   */
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

  /** Instantly jump to the current target, cancelling the animation. */
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

  // ── internals ───────────────────────────────────────────────────────────────

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

  /** Apply spring content size (logical pixels, frameless window). */
  private _applyFrame(): void {
    if (this.win.isDestroyed()) return
    const s = this.s
    this.win.setContentSize(
      Math.max(1, Math.round(s.w)),
      Math.max(1, Math.round(s.h))
    )
  }
}

// ── Per-window controller registry ──────────────────────────────────────────

const registry = new WeakMap<BrowserWindow, WindowSpringController>()

/**
 * Returns the existing spring controller for `win`, or creates one.
 * The controller is automatically cleaned up when the window closes.
 */
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
