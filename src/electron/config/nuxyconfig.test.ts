import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'

vi.mock('../themes/install.js', () => ({
  ensureUserThemes: vi.fn(),
  DEFAULT_DARK_THEME: { version: 1, name: 'dark', vars: {} },
  DEFAULT_LIGHT_THEME: { version: 1, name: 'light', vars: {} },
}))

import { getWindowPosition, reloadConfig, getConfig } from './nuxyconfig.js'

const DISPLAY = { x: 0, y: 0, width: 1920, height: 1080 }
const WIN_W = 800
const WIN_H = 600

function setupConfig(windowPosition?: string): void {
  const settings = windowPosition !== undefined ? { windowPosition } : {}
  vi.spyOn(fs, 'existsSync').mockReturnValue(true)
  vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any)
  vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(settings))
  vi.spyOn(fs, 'watch').mockImplementation(() => ({ close: vi.fn() } as any))
  reloadConfig()
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getWindowPosition', () => {
  describe('default centering (no windowPosition)', () => {
    it('centers the window horizontally', () => {
      setupConfig(undefined)
      const { x } = getWindowPosition(WIN_W, WIN_H, DISPLAY)
      expect(x).toBe(Math.round((1920 - 800) / 2))
    })

    it('centers the window vertically', () => {
      setupConfig(undefined)
      const { y } = getWindowPosition(WIN_W, WIN_H, DISPLAY)
      expect(y).toBe(Math.round((1080 - 600) / 2))
    })

    it('returns integers', () => {
      setupConfig(undefined)
      const { x, y } = getWindowPosition(WIN_W, WIN_H, DISPLAY)
      expect(Number.isInteger(x)).toBe(true)
      expect(Number.isInteger(y)).toBe(true)
    })

    it('respects display offset', () => {
      setupConfig(undefined)
      const display2 = { x: 1920, y: 0, width: 1920, height: 1080 }
      const { x } = getWindowPosition(WIN_W, WIN_H, display2)
      expect(x).toBe(1920 + Math.round((1920 - 800) / 2))
    })
  })

  describe('"center" keyword', () => {
    it('single "center" centers x only', () => {
      setupConfig('center')
      const { x } = getWindowPosition(WIN_W, WIN_H, DISPLAY)
      expect(x).toBe(Math.round((1920 - 800) / 2))
    })

    it('"center center" centers both axes', () => {
      setupConfig('center center')
      const { x, y } = getWindowPosition(WIN_W, WIN_H, DISPLAY)
      expect(x).toBe(Math.round((1920 - 800) / 2))
      expect(y).toBe(Math.round((1080 - 600) / 2))
    })
  })

  describe('px values', () => {
    it('sets absolute x position', () => {
      setupConfig('200px 100px')
      const { x, y } = getWindowPosition(WIN_W, WIN_H, DISPLAY)
      expect(x).toBe(200)
      expect(y).toBe(100)
    })

    it('0px places window at display left/top edge', () => {
      setupConfig('0px 0px')
      const { x, y } = getWindowPosition(WIN_W, WIN_H, DISPLAY)
      expect(x).toBe(0)
      expect(y).toBe(0)
    })

    it('respects display offset with px', () => {
      setupConfig('100px 50px')
      const display2 = { x: 500, y: 100, width: 1920, height: 1080 }
      const { x, y } = getWindowPosition(WIN_W, WIN_H, display2)
      expect(x).toBe(600) // 500 + 100
      expect(y).toBe(150) // 100 + 50
    })
  })

  describe('percent values', () => {
    it('50% centers the window', () => {
      setupConfig('50% 50%')
      const { x, y } = getWindowPosition(WIN_W, WIN_H, DISPLAY)
      expect(x).toBe(Math.round(1920 * 0.5 - 800 / 2))
      expect(y).toBe(Math.round(1080 * 0.5 - 600 / 2))
    })

    it('0% places window at left/top', () => {
      setupConfig('0% 0%')
      const { x, y } = getWindowPosition(WIN_W, WIN_H, DISPLAY)
      expect(x).toBe(Math.round(0 - 800 / 2))
      expect(y).toBe(Math.round(0 - 600 / 2))
    })

    it('100% places window at far right/bottom', () => {
      setupConfig('100% 100%')
      const { x, y } = getWindowPosition(WIN_W, WIN_H, DISPLAY)
      expect(x).toBe(Math.round(1920 * 1 - 800 / 2))
      expect(y).toBe(Math.round(1080 * 1 - 600 / 2))
    })
  })

  describe('fraction values (n/m)', () => {
    it('1/2 centers the window', () => {
      setupConfig('1/2 1/2')
      const { x, y } = getWindowPosition(WIN_W, WIN_H, DISPLAY)
      expect(x).toBe(Math.round(1920 * 0.5 - 800 / 2))
      expect(y).toBe(Math.round(1080 * 0.5 - 600 / 2))
    })

    it('1/3 positions at one third', () => {
      setupConfig('1/3 1/3')
      const { x, y } = getWindowPosition(WIN_W, WIN_H, DISPLAY)
      expect(x).toBe(Math.round(1920 / 3 - 800 / 2))
      expect(y).toBe(Math.round(1080 / 3 - 600 / 2))
    })

    it('2/3 positions at two thirds', () => {
      setupConfig('2/3 2/3')
      const { x, y } = getWindowPosition(WIN_W, WIN_H, DISPLAY)
      expect(x).toBe(Math.round((1920 * 2) / 3 - 800 / 2))
      expect(y).toBe(Math.round((1080 * 2) / 3 - 600 / 2))
    })
  })

  describe('float ratio values (0–1)', () => {
    it('0.5 centers', () => {
      setupConfig('0.5 0.5')
      const { x, y } = getWindowPosition(WIN_W, WIN_H, DISPLAY)
      expect(x).toBe(Math.round(1920 * 0.5 - 800 / 2))
      expect(y).toBe(Math.round(1080 * 0.5 - 600 / 2))
    })

    it('0.25 positions at quarter', () => {
      setupConfig('0.25 0.25')
      const { x, y } = getWindowPosition(WIN_W, WIN_H, DISPLAY)
      expect(x).toBe(Math.round(1920 * 0.25 - 800 / 2))
    })

    it('0 falls back to center (treated as ratio)', () => {
      setupConfig('0 0')
      const { x, y } = getWindowPosition(WIN_W, WIN_H, DISPLAY)
      expect(x).toBe(Math.round(1920 * 0 - 800 / 2))
      expect(y).toBe(Math.round(1080 * 0 - 600 / 2))
    })
  })

  describe('raw integer > 1 (pixel coordinate)', () => {
    it('treats integer > 1 as absolute pixel', () => {
      setupConfig('300 150')
      const { x, y } = getWindowPosition(WIN_W, WIN_H, DISPLAY)
      expect(x).toBe(300)
      expect(y).toBe(150)
    })
  })
})

describe('config validation', () => {
  function setupWithSettings(settings: object): void {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any)
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(settings))
    vi.spyOn(fs, 'watch').mockImplementation(() => ({ close: vi.fn() } as any))
    reloadConfig()
  }

  it('applies valid escAction', () => {
    setupWithSettings({ escAction: 'minimize' })
    expect(getConfig().escAction).toBe('minimize')
  })

  it('applies valid blurAction', () => {
    setupWithSettings({ blurAction: 'quit' })
    expect(getConfig().blurAction).toBe('quit')
  })

  it('rejects invalid escAction and falls back to default', () => {
    setupWithSettings({ escAction: 'explode' })
    expect(getConfig().escAction).toBe('hide')
  })

  it('rejects invalid blurAction and falls back to default', () => {
    setupWithSettings({ blurAction: 123 })
    expect(getConfig().blurAction).toBe('hide')
  })

  it('accepts windowWidth >= 200', () => {
    setupWithSettings({ windowWidth: 1200 })
    expect(getConfig().windowWidth).toBe(1200)
  })

  it('rejects windowWidth < 200 and keeps default', () => {
    setupWithSettings({ windowWidth: 100 })
    expect(getConfig().windowWidth).toBe(800)
  })

  it('accepts windowMaxHeight >= 48', () => {
    setupWithSettings({ windowMaxHeight: 900 })
    expect(getConfig().windowMaxHeight).toBe(900)
  })

  it('rejects windowMaxHeight < 48 and keeps default', () => {
    setupWithSettings({ windowMaxHeight: 10 })
    expect(getConfig().windowMaxHeight).toBe(600)
  })

  it('clamps opacity to [0, 1]', () => {
    setupWithSettings({ opacity: 1.5 })
    expect(getConfig().opacity).toBe(1)
  })

  it('clamps opacity below 0 to 0', () => {
    setupWithSettings({ opacity: -0.5 })
    expect(getConfig().opacity).toBe(0)
  })

  it('accepts alwaysOnTop boolean', () => {
    setupWithSettings({ alwaysOnTop: true })
    expect(getConfig().alwaysOnTop).toBe(true)
  })

  it('rejects non-boolean alwaysOnTop', () => {
    setupWithSettings({ alwaysOnTop: 'yes' })
    expect(getConfig().alwaysOnTop).toBe(false)
  })

  it('uses all defaults when settings.json is empty', () => {
    setupWithSettings({})
    const cfg = getConfig()
    expect(cfg.escAction).toBe('hide')
    expect(cfg.blurAction).toBe('hide')
    expect(cfg.windowWidth).toBe(800)
    expect(cfg.windowMaxHeight).toBe(600)
    expect(cfg.alwaysOnTop).toBe(false)
    expect(cfg.opacity).toBe(1)
    expect(cfg.showInTaskbar).toBe(false)
    expect(cfg.showOnStartup).toBe(false)
  })

  it('reloadConfig clears cached config and re-reads new values', () => {
    setupWithSettings({ escAction: 'hide', windowWidth: 800 })
    expect(getConfig().escAction).toBe('hide')

    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ escAction: 'none', windowWidth: 900 }))
    reloadConfig()

    expect(getConfig().escAction).toBe('none')
    expect(getConfig().windowWidth).toBe(900)
  })
})

describe('settings.json watch callback triggers hot-reload', () => {
  // isWatching is module-level state. We use vi.resetModules() + dynamic import
  // to get a fresh module instance where isWatching starts at false.

  it('watch fires on settings.json change and config updates', async () => {
    let capturedCallback: ((event: string, filename: string | null) => void) | null = null

    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any)
    const readSpy = vi
      .spyOn(fs, 'readFileSync')
      .mockReturnValue(JSON.stringify({ escAction: 'hide' }))
    vi.spyOn(fs, 'watch').mockImplementation((_p: any, cb: any) => {
      capturedCallback = cb
      return { close: vi.fn() } as any
    })

    vi.resetModules()
    const mod = await import('./nuxyconfig.js')
    mod.reloadConfig()
    expect(mod.getConfig().escAction).toBe('hide')
    expect(capturedCallback).not.toBeNull()

    readSpy.mockReturnValue(JSON.stringify({ escAction: 'minimize' }))
    capturedCallback!('change', 'settings.json')

    expect(mod.getConfig().escAction).toBe('minimize')
  })

  it('watch callback ignores unrelated filename changes', async () => {
    let capturedCallback: ((event: string, filename: string | null) => void) | null = null

    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any)
    const readSpy = vi
      .spyOn(fs, 'readFileSync')
      .mockReturnValue(JSON.stringify({ escAction: 'none' }))
    vi.spyOn(fs, 'watch').mockImplementation((_p: any, cb: any) => {
      capturedCallback = cb
      return { close: vi.fn() } as any
    })

    vi.resetModules()
    const mod = await import('./nuxyconfig.js')
    mod.reloadConfig()
    expect(mod.getConfig().escAction).toBe('none')
    expect(capturedCallback).not.toBeNull()

    readSpy.mockReturnValue(JSON.stringify({ escAction: 'quit' }))
    // Change for a different file — must NOT trigger a reload
    capturedCallback!('change', 'other.json')

    expect(mod.getConfig().escAction).toBe('none')
  })
})
