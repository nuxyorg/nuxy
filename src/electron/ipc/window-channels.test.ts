import { describe, it, expect, vi, beforeEach } from 'vitest'

const onHandlers: Record<string, Function> = {}
const handleHandlers: Record<string, Function> = {}

vi.mock('electron', () => ({
  ipcMain: {
    on: vi.fn((channel: string, handler: Function) => {
      onHandlers[channel] = handler
    }),
    handle: vi.fn((channel: string, handler: Function) => {
      handleHandlers[channel] = handler
    }),
  },
  app: {
    quit: vi.fn(),
  },
  screen: {
    getCursorScreenPoint: vi.fn(() => ({ x: 0, y: 0 })),
  },
  BrowserWindow: {
    fromWebContents: vi.fn(),
  },
}))

vi.mock('../config/nuxyconfig.js', () => ({
  getConfig: vi.fn(() => ({ escAction: 'hide' })),
}))

vi.mock('../window/runtime.js', () => ({
  positionWindowOnDisplay: vi.fn(),
}))

vi.mock('../window/spring.js', () => ({
  getOrCreateSpring: vi.fn(),
}))

vi.mock('../window/manager.js', () => ({
  onPreloadsLoaded: vi.fn(),
  onRendererReady: vi.fn(),
  setBlurSuppressed: vi.fn(),
  clearBlurSuppressed: vi.fn(),
  tryHideMainWindow: vi.fn(),
  isBlurSuppressed: vi.fn(() => false),
}))

import { app, screen, BrowserWindow } from 'electron'
import { getConfig } from '../config/nuxyconfig.js'
import { positionWindowOnDisplay } from '../window/runtime.js'
import { getOrCreateSpring } from '../window/spring.js'
import {
  onPreloadsLoaded,
  onRendererReady,
  setBlurSuppressed,
  clearBlurSuppressed,
  tryHideMainWindow,
  isBlurSuppressed,
} from '../window/manager.js'
import { registerWindowChannels } from './window-channels.js'

function makeWin(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    isDestroyed: vi.fn(() => false),
    getPosition: vi.fn(() => [10, 20]),
    setPosition: vi.fn(),
    minimize: vi.fn(),
    hide: vi.fn(),
    ...overrides,
  }
}

const fakeEvent = { sender: {} } as any

describe('window-channels', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(onHandlers).forEach((k) => delete onHandlers[k])
    Object.keys(handleHandlers).forEach((k) => delete handleHandlers[k])
    vi.mocked(getConfig).mockReturnValue({ escAction: 'hide' } as any)
    vi.mocked(screen.getCursorScreenPoint).mockReturnValue({ x: 0, y: 0 } as any)
    vi.mocked(getOrCreateSpring).mockReturnValue({ pause: vi.fn(), syncState: vi.fn() } as any)
    registerWindowChannels()
  })

  it('window:center calls positionWindowOnDisplay with the resolved window', () => {
    const win = makeWin()
    vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(win as any)

    onHandlers['window:center'](fakeEvent)

    expect(BrowserWindow.fromWebContents).toHaveBeenCalledWith(fakeEvent.sender)
    expect(positionWindowOnDisplay).toHaveBeenCalledWith(win)
  })

  it('window:center does nothing if no window resolved', () => {
    vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(null as any)
    expect(() => onHandlers['window:center'](fakeEvent)).not.toThrow()
    expect(positionWindowOnDisplay).not.toHaveBeenCalled()
  })

  describe('drag lifecycle', () => {
    it('window:drag-start computes offset from cursor and window position, and pauses spring', () => {
      const win = makeWin()
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(win as any)
      vi.mocked(screen.getCursorScreenPoint).mockReturnValue({ x: 5, y: 7 } as any)
      win.getPosition.mockReturnValue([10, 20])

      const spring = { pause: vi.fn(), syncState: vi.fn() }
      vi.mocked(getOrCreateSpring).mockReturnValue(spring as any)

      onHandlers['window:drag-start'](fakeEvent)

      expect(getOrCreateSpring).toHaveBeenCalledWith(win)
      expect(spring.pause).toHaveBeenCalled()

      // verify offset via drag-move behavior
      vi.mocked(screen.getCursorScreenPoint).mockReturnValue({ x: 100, y: 200 } as any)
      onHandlers['window:drag-move'](fakeEvent)
      // offset = (10-5, 20-7) = (5, 13); new pos = (100+5, 200+13)
      expect(win.setPosition).toHaveBeenCalledWith(105, 213)
    })

    it('window:drag-start does nothing if window is missing or destroyed', () => {
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(null as any)
      expect(() => onHandlers['window:drag-start'](fakeEvent)).not.toThrow()
      expect(getOrCreateSpring).not.toHaveBeenCalled()

      const destroyedWin = makeWin({ isDestroyed: vi.fn(() => true) })
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(destroyedWin as any)
      onHandlers['window:drag-start'](fakeEvent)
      expect(getOrCreateSpring).not.toHaveBeenCalled()
    })

    it('window:drag-move is a no-op if drag-start was never called', () => {
      const win = makeWin()
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(win as any)
      // Ensure no offset is left over from a previous test (module-level state).
      onHandlers['window:drag-end'](fakeEvent)
      win.setPosition.mockClear()

      onHandlers['window:drag-move'](fakeEvent)
      expect(win.setPosition).not.toHaveBeenCalled()
    })

    it('window:drag-end clears offset and calls syncState on the spring', () => {
      const win = makeWin()
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(win as any)
      vi.mocked(screen.getCursorScreenPoint).mockReturnValue({ x: 5, y: 7 } as any)

      const spring = { pause: vi.fn(), syncState: vi.fn() }
      vi.mocked(getOrCreateSpring).mockReturnValue(spring as any)

      onHandlers['window:drag-start'](fakeEvent)
      onHandlers['window:drag-end'](fakeEvent)

      expect(spring.syncState).toHaveBeenCalled()

      // After drag-end, drag-move should be a no-op again (offset cleared)
      win.setPosition.mockClear()
      onHandlers['window:drag-move'](fakeEvent)
      expect(win.setPosition).not.toHaveBeenCalled()
    })

    it('window:drag-end is a no-op if drag-start was never called', () => {
      const win = makeWin()
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(win as any)
      onHandlers['window:drag-end'](fakeEvent)
      expect(getOrCreateSpring).not.toHaveBeenCalled()
    })
  })

  it('window:hide calls tryHideMainWindow', () => {
    const win = makeWin()
    vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(win as any)

    onHandlers['window:hide'](fakeEvent)

    expect(tryHideMainWindow).toHaveBeenCalledWith('ipc-window-hide', expect.any(Function))
    const cb = vi.mocked(tryHideMainWindow).mock.calls[0][1] as () => void
    cb()
    expect(win.hide).toHaveBeenCalled()
  })

  it('window:quit calls app.quit()', () => {
    onHandlers['window:quit'](fakeEvent)
    expect(app.quit).toHaveBeenCalled()
  })

  describe('window:esc', () => {
    it('minimize branch calls win.minimize()', () => {
      vi.mocked(getConfig).mockReturnValue({ escAction: 'minimize' } as any)
      const win = makeWin()
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(win as any)

      onHandlers['window:esc'](fakeEvent)

      expect(win.minimize).toHaveBeenCalled()
      expect(app.quit).not.toHaveBeenCalled()
      expect(tryHideMainWindow).not.toHaveBeenCalled()
    })

    it('quit branch calls app.quit()', () => {
      vi.mocked(getConfig).mockReturnValue({ escAction: 'quit' } as any)
      const win = makeWin()
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(win as any)

      onHandlers['window:esc'](fakeEvent)

      expect(app.quit).toHaveBeenCalled()
      expect(win.minimize).not.toHaveBeenCalled()
      expect(tryHideMainWindow).not.toHaveBeenCalled()
    })

    it('none branch does nothing', () => {
      vi.mocked(getConfig).mockReturnValue({ escAction: 'none' } as any)
      const win = makeWin()
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(win as any)

      onHandlers['window:esc'](fakeEvent)

      expect(win.minimize).not.toHaveBeenCalled()
      expect(app.quit).not.toHaveBeenCalled()
      expect(tryHideMainWindow).not.toHaveBeenCalled()
    })

    it('default/hide branch calls tryHideMainWindow', () => {
      vi.mocked(getConfig).mockReturnValue({ escAction: 'hide' } as any)
      const win = makeWin()
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(win as any)

      onHandlers['window:esc'](fakeEvent)

      expect(tryHideMainWindow).toHaveBeenCalledWith('ipc-window-esc', expect.any(Function))
      const cb = vi.mocked(tryHideMainWindow).mock.calls[0][1] as () => void
      cb()
      expect(win.hide).toHaveBeenCalled()
    })

    it('unknown escAction falls through to default hide branch', () => {
      vi.mocked(getConfig).mockReturnValue({ escAction: 'something-else' } as any)
      const win = makeWin()
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(win as any)

      onHandlers['window:esc'](fakeEvent)

      expect(tryHideMainWindow).toHaveBeenCalled()
    })

    it('does nothing if no window resolved', () => {
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(null as any)
      expect(() => onHandlers['window:esc'](fakeEvent)).not.toThrow()
      expect(tryHideMainWindow).not.toHaveBeenCalled()
    })
  })

  it('window:preloads-loaded calls through to onPreloadsLoaded', () => {
    onHandlers['window:preloads-loaded'](fakeEvent)
    expect(onPreloadsLoaded).toHaveBeenCalled()
  })

  it('window:ready calls through to onRendererReady', () => {
    onHandlers['window:ready'](fakeEvent)
    expect(onRendererReady).toHaveBeenCalled()
  })

  describe('window:set-blur-suppressed', () => {
    it("'clear' string payload calls clearBlurSuppressed()", () => {
      onHandlers['window:set-blur-suppressed'](fakeEvent, 'clear')
      expect(clearBlurSuppressed).toHaveBeenCalled()
      expect(setBlurSuppressed).not.toHaveBeenCalled()
    })

    it('boolean payload calls setBlurSuppressed(payload, "tool")', () => {
      onHandlers['window:set-blur-suppressed'](fakeEvent, true)
      expect(setBlurSuppressed).toHaveBeenCalledWith(true, 'tool')
    })

    it('boolean false payload calls setBlurSuppressed(false, "tool")', () => {
      onHandlers['window:set-blur-suppressed'](fakeEvent, false)
      expect(setBlurSuppressed).toHaveBeenCalledWith(false, 'tool')
    })

    it('object payload with source "manifest" calls setBlurSuppressed with manifest source', () => {
      onHandlers['window:set-blur-suppressed'](fakeEvent, { suppressed: true, source: 'manifest' })
      expect(setBlurSuppressed).toHaveBeenCalledWith(true, 'manifest')
    })

    it('object payload with unknown/missing source defaults to "tool"', () => {
      onHandlers['window:set-blur-suppressed'](fakeEvent, { suppressed: true, source: 'bogus' })
      expect(setBlurSuppressed).toHaveBeenCalledWith(true, 'tool')

      vi.mocked(setBlurSuppressed).mockClear()
      onHandlers['window:set-blur-suppressed'](fakeEvent, { suppressed: false })
      expect(setBlurSuppressed).toHaveBeenCalledWith(false, 'tool')
    })
  })

  describe('window:set-blur-suppressed-sync', () => {
    it('calls setBlurSuppressed with the right args and returns suppressed state', () => {
      vi.mocked(isBlurSuppressed).mockReturnValue(true)

      const result = handleHandlers['window:set-blur-suppressed-sync'](fakeEvent, {
        suppressed: true,
        source: 'manifest',
      })

      expect(setBlurSuppressed).toHaveBeenCalledWith(true, 'manifest')
      expect(result).toEqual({ suppressed: true })
    })

    it('defaults source to "tool" when not manifest', () => {
      vi.mocked(isBlurSuppressed).mockReturnValue(false)

      const result = handleHandlers['window:set-blur-suppressed-sync'](fakeEvent, {
        suppressed: false,
      })

      expect(setBlurSuppressed).toHaveBeenCalledWith(false, 'tool')
      expect(result).toEqual({ suppressed: false })
    })
  })
})
