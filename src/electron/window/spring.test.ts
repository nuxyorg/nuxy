import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WindowSpringController, getOrCreateSpring } from './spring.js'

vi.mock('electron', () => ({
  BrowserWindow: class {},
  app: { getPath: vi.fn(() => '/tmp') },
  ipcMain: { handle: vi.fn(), on: vi.fn() },
}))

function createWin(w = 800, h = 600) {
  return {
    getContentSize: vi.fn(() => [w, h]),
    setContentSize: vi.fn(),
    isDestroyed: vi.fn(() => false),
    once: vi.fn(),
  }
}

describe('WindowSpringController', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  describe('constructor', () => {
    it('reads initial size from window', () => {
      const win = createWin(1024, 768)
      const ctrl = new WindowSpringController(win as any)
      expect(win.getContentSize).toHaveBeenCalled()
      expect(ctrl.isAnimating()).toBe(false)
    })
  })

  describe('setTarget', () => {
    it('starts the animation timer', () => {
      const win = createWin()
      const ctrl = new WindowSpringController(win as any)
      ctrl.setTarget({ width: 1000, height: 700 })
      expect(ctrl.isAnimating()).toBe(true)
    })

    it('does not start a second timer if already animating', () => {
      const win = createWin()
      const ctrl = new WindowSpringController(win as any)
      ctrl.setTarget({ width: 1000 })
      ctrl.setTarget({ height: 700 })
      expect(ctrl.isAnimating()).toBe(true)
    })

    it('applies partial width update without changing height target', () => {
      const win = createWin(800, 600)
      const ctrl = new WindowSpringController(win as any)
      ctrl.setTarget({ width: 1200 })
      expect(ctrl.isAnimating()).toBe(true)
    })

    it('applies partial height update without changing width target', () => {
      const win = createWin(800, 600)
      const ctrl = new WindowSpringController(win as any)
      ctrl.setTarget({ height: 900 })
      expect(ctrl.isAnimating()).toBe(true)
    })
  })

  describe('isAnimating', () => {
    it('returns false before any setTarget call', () => {
      const win = createWin()
      const ctrl = new WindowSpringController(win as any)
      expect(ctrl.isAnimating()).toBe(false)
    })

    it('returns true while animating', () => {
      const win = createWin()
      const ctrl = new WindowSpringController(win as any)
      ctrl.setTarget({ width: 1600 })
      expect(ctrl.isAnimating()).toBe(true)
    })

    it('returns false after destroy', () => {
      const win = createWin()
      const ctrl = new WindowSpringController(win as any)
      ctrl.setTarget({ width: 1600 })
      ctrl.destroy()
      expect(ctrl.isAnimating()).toBe(false)
    })
  })

  describe('destroy', () => {
    it('stops animation', () => {
      const win = createWin()
      const ctrl = new WindowSpringController(win as any)
      ctrl.setTarget({ width: 1600 })
      ctrl.destroy()
      expect(ctrl.isAnimating()).toBe(false)
    })

    it('is safe to call when not animating', () => {
      const win = createWin()
      const ctrl = new WindowSpringController(win as any)
      expect(() => ctrl.destroy()).not.toThrow()
    })
  })

  describe('pause and resume', () => {
    it('pause stops animation', () => {
      const win = createWin()
      const ctrl = new WindowSpringController(win as any)
      ctrl.setTarget({ width: 1600 })
      ctrl.pause()
      expect(ctrl.isAnimating()).toBe(false)
    })

    it('resume restarts animation when target differs from current', () => {
      const win = createWin(800, 600)
      const ctrl = new WindowSpringController(win as any)
      ctrl.setTarget({ width: 1600 })
      ctrl.pause()
      ctrl.resume()
      expect(ctrl.isAnimating()).toBe(true)
    })

    it('resume does nothing when already at target', () => {
      const win = createWin(800, 600)
      const ctrl = new WindowSpringController(win as any)
      // No setTarget — current == target
      ctrl.resume()
      expect(ctrl.isAnimating()).toBe(false)
    })
  })

  describe('syncState', () => {
    it('stops animation and resets to current window size', () => {
      const win = createWin(800, 600)
      const ctrl = new WindowSpringController(win as any)
      ctrl.setTarget({ width: 1600 })
      ctrl.syncState()
      expect(ctrl.isAnimating()).toBe(false)
      expect(win.getContentSize).toHaveBeenCalled()
    })

    it('skips setContentSize if window is destroyed', () => {
      const win = createWin()
      win.isDestroyed.mockReturnValue(true)
      const ctrl = new WindowSpringController(win as any)
      expect(() => ctrl.syncState()).not.toThrow()
    })
  })

  describe('snapToTarget', () => {
    it('applies the target size immediately', () => {
      const win = createWin(800, 600)
      const ctrl = new WindowSpringController(win as any)
      ctrl.setTarget({ width: 1000, height: 700 })
      ctrl.snapToTarget()
      expect(win.setContentSize).toHaveBeenCalledWith(1000, 700)
    })

    it('stops animation after snap', () => {
      const win = createWin(800, 600)
      const ctrl = new WindowSpringController(win as any)
      ctrl.setTarget({ width: 1000, height: 700 })
      ctrl.snapToTarget()
      expect(ctrl.isAnimating()).toBe(false)
    })

    it('clamps content size to minimum 1', () => {
      const win = createWin(0, 0)
      const ctrl = new WindowSpringController(win as any)
      ctrl.snapToTarget()
      expect(win.setContentSize).toHaveBeenCalledWith(1, 1)
    })
  })

  describe('spring physics (tick)', () => {
    it('advances toward target on each tick', () => {
      const win = createWin(800, 600)
      const ctrl = new WindowSpringController(win as any)
      ctrl.setTarget({ width: 1200, height: 800 })

      vi.advanceTimersByTime(16)

      expect(win.setContentSize).toHaveBeenCalled()
      const [w, h] = win.setContentSize.mock.calls[0]
      expect(w).toBeGreaterThan(800)
      expect(h).toBeGreaterThan(600)
    })

    it('stops animating when spring reaches rest', () => {
      const win = createWin(800, 600)
      const ctrl = new WindowSpringController(win as any)
      ctrl.setTarget({ width: 802, height: 601 }) // Very small delta → rest quickly

      vi.advanceTimersByTime(1000)

      expect(ctrl.isAnimating()).toBe(false)
    })

    it('sets final size to exact target when at rest', () => {
      const win = createWin(800, 600)
      const ctrl = new WindowSpringController(win as any)
      ctrl.setTarget({ width: 802, height: 601 })

      vi.advanceTimersByTime(500)

      const calls = win.setContentSize.mock.calls
      const last = calls[calls.length - 1]
      expect(last[0]).toBe(802)
      expect(last[1]).toBe(601)
    })

    it('stops when window is destroyed mid-animation', () => {
      const win = createWin(800, 600)
      const ctrl = new WindowSpringController(win as any)
      ctrl.setTarget({ width: 1200 })

      win.isDestroyed.mockReturnValue(true)
      vi.advanceTimersByTime(32)

      expect(ctrl.isAnimating()).toBe(false)
    })
  })

  describe('getOrCreateSpring', () => {
    it('creates a controller for a new window', () => {
      const win = createWin()
      const ctrl = getOrCreateSpring(win as any)
      expect(ctrl).toBeInstanceOf(WindowSpringController)
    })

    it('returns the same controller on subsequent calls', () => {
      const win = createWin()
      const c1 = getOrCreateSpring(win as any)
      const c2 = getOrCreateSpring(win as any)
      expect(c1).toBe(c2)
    })

    it('accepts custom spring config', () => {
      const win = createWin()
      const ctrl = getOrCreateSpring(win as any, { stiffness: 0.14, damping: 0.88 })
      expect(ctrl).toBeInstanceOf(WindowSpringController)
    })
  })
})
