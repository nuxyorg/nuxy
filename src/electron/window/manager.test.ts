import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isPreloadsLoaded,
  onPreloadsLoaded,
  createMainWindow,
  getMainWindow,
  onRendererReady,
} from './manager.js'
import { getConfig } from '../config/nuxyconfig.js'

const onceHandlers: Record<string, () => void> = {}

const makeMockWin = () => ({
  on: vi.fn(),
  once: vi.fn((event: string, handler: () => void) => {
    onceHandlers[event] = handler
  }),
  loadURL: vi.fn(),
  loadFile: vi.fn(),
  isDestroyed: vi.fn(() => false),
  isVisible: vi.fn(() => false),
  show: vi.fn(),
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
  })),
}))

vi.mock('./runtime.js', () => ({
  applyConfigToWindow: vi.fn(),
  positionWindowOnDisplay: vi.fn(),
}))

describe('Window Manager - Preloads Load Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(onceHandlers).forEach((k) => delete onceHandlers[k])
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
})
