import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isPreloadsLoaded,
  onPreloadsLoaded,
  createMainWindow,
  getMainWindow,
  onRendererReady,
  setBlurSuppressed,
  clearBlurSuppressed,
} from './manager.js'
import { getConfig } from '../config/nuxyconfig.js'

const onceHandlers: Record<string, () => void> = {}
const eventHandlers: Record<string, () => void> = {}

const makeMockWin = () => ({
  on: vi.fn((event: string, handler: () => void) => {
    eventHandlers[event] = handler
  }),
  once: vi.fn((event: string, handler: () => void) => {
    onceHandlers[event] = handler
  }),
  loadURL: vi.fn(),
  loadFile: vi.fn(),
  isDestroyed: vi.fn(() => false),
  isVisible: vi.fn(() => false),
  show: vi.fn(),
  hide: vi.fn(),
  minimize: vi.fn(),
  destroy: vi.fn(),
  webContents: { send: vi.fn() },
})

vi.mock('electron', () => ({
  app: { getAppPath: vi.fn(() => '/mock/app/path') },
  BrowserWindow: vi.fn().mockImplementation(() => makeMockWin()),
}))

vi.mock('../config/nuxyconfig.js', () => ({
  getConfig: vi.fn(() => ({
    windowWidth: 800,
    alwaysOnTop: false,
    showInTaskbar: false,
    showOnStartup: true,
    blurAction: 'hide',
  })),
}))

vi.mock('./runtime.js', () => ({
  applyConfigToWindow: vi.fn(),
  positionWindowOnDisplay: vi.fn(),
}))

describe('Window Manager - Preloads Load Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearBlurSuppressed()
    Object.keys(onceHandlers).forEach((k) => delete onceHandlers[k])
    Object.keys(eventHandlers).forEach((k) => delete eventHandlers[k])
  })

  it('initially preloadsLoaded is false', () => {
    expect(isPreloadsLoaded()).toBe(false)
  })

  it('onPreloadsLoaded marks preloadsLoaded as true', () => {
    createMainWindow()
    onPreloadsLoaded()
    expect(isPreloadsLoaded()).toBe(true)
  })

  it('shows window when both ready-to-show and renderer ready fire (showOnStartup true)', () => {
    createMainWindow()
    const win = getMainWindow()
    expect(win).toBeDefined()

    onceHandlers['ready-to-show']?.()
    onRendererReady()

    expect(win?.show).toHaveBeenCalled()
    expect(win?.webContents.send).toHaveBeenCalledWith('window:show')
  })

  it('shows window regardless of event order (renderer ready then ready-to-show)', () => {
    createMainWindow()
    const win = getMainWindow()
    expect(win).toBeDefined()

    onRendererReady()
    onceHandlers['ready-to-show']?.()

    expect(win?.show).toHaveBeenCalled()
    expect(win?.webContents.send).toHaveBeenCalledWith('window:show')
  })

  it('does not show window if showOnStartup is false', () => {
    vi.mocked(getConfig).mockReturnValueOnce({
      windowWidth: 800,
      alwaysOnTop: false,
      showInTaskbar: false,
      showOnStartup: false,
    } as any)
    createMainWindow()
    const win = getMainWindow()

    onceHandlers['ready-to-show']?.()
    onRendererReady()

    expect(win?.show).not.toHaveBeenCalled()
  })

  it('blur handler hides window by default', () => {
    createMainWindow()
    const win = getMainWindow()
    eventHandlers['blur']?.()
    expect(win?.hide).toHaveBeenCalled()
  })

  it('blur handler is ignored while suppression is active', () => {
    createMainWindow()
    const win = getMainWindow()
    setBlurSuppressed(true, 'tool')
    eventHandlers['blur']?.()
    expect(win?.hide).not.toHaveBeenCalled()
  })

  it('blur handler is ignored when only tool-layer suppression is active', () => {
    createMainWindow()
    const win = getMainWindow()
    setBlurSuppressed(false, 'manifest')
    setBlurSuppressed(true, 'tool')
    eventHandlers['blur']?.()
    expect(win?.hide).not.toHaveBeenCalled()
  })

  it('clearBlurSuppressed clears manifest layer only', () => {
    createMainWindow()
    setBlurSuppressed(true, 'tool')
    setBlurSuppressed(true, 'manifest')
    clearBlurSuppressed()
    const win = getMainWindow()
    eventHandlers['blur']?.()
    expect(win?.hide).not.toHaveBeenCalled()
  })

  it('blur handler hides when manifest suppression is cleared but tool is false', () => {
    createMainWindow()
    const win = getMainWindow()
    setBlurSuppressed(false, 'manifest')
    setBlurSuppressed(false, 'tool')
    eventHandlers['blur']?.()
    expect(win?.hide).toHaveBeenCalled()
  })
})
