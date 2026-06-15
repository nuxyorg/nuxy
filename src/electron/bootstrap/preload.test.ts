import { vi, describe, it, expect } from 'vitest'

// Step 1: use vi.hoisted to create mock fns before vi.mock factories run
const { mockExposeInMainWorld, mockInvoke, mockSend, mockOn, mockOff } = vi.hoisted(() => ({
  mockExposeInMainWorld: vi.fn(),
  mockInvoke: vi.fn().mockResolvedValue({ success: true, data: [] }),
  mockSend: vi.fn(),
  mockOn: vi.fn(),
  mockOff: vi.fn(),
}))

// Step 2: mock electron using hoisted fns
vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: mockExposeInMainWorld },
  ipcRenderer: {
    invoke: mockInvoke,
    send: mockSend,
    on: mockOn,
    off: mockOff,
  },
}))

// Step 3: import preload — side effects run with our mocked electron
import '../bootstrap/preload.js'

// Helper: extract the 'core' object that was exposed
function getExposedCore(): Record<string, any> {
  const coreCall = mockExposeInMainWorld.mock.calls.find((c: any[]) => c[0] === 'core')
  if (!coreCall) throw new Error('contextBridge.exposeInMainWorld was not called with "core"')
  return coreCall[1]
}

// ── A. contextBridge API shape ───────────────────────────────────────────────

describe('contextBridge.exposeInMainWorld', () => {
  it('exposes "core" as the first arg', () => {
    const call = mockExposeInMainWorld.mock.calls.find((c: any[]) => c[0] === 'core')
    expect(call).toBeDefined()
    expect(call![0]).toBe('core')
  })

  it('exposed object has ipc, window, icons, themes, tools, composition, shell, events keys', () => {
    const core = getExposedCore()
    expect(core).toHaveProperty('ipc')
    expect(core).toHaveProperty('window')
    expect(core).toHaveProperty('icons')
    expect(core).toHaveProperty('themes')
    expect(core).toHaveProperty('tools')
    expect(core).toHaveProperty('composition')
    expect(core).toHaveProperty('shell')
    expect(core).toHaveProperty('events')
  })

  it('window object has all 9 methods: ready, resize, hide, esc, center, dragStart, dragMove, dragEnd, onShow', () => {
    const { window } = getExposedCore()
    for (const method of [
      'ready',
      'resize',
      'hide',
      'esc',
      'center',
      'dragStart',
      'dragMove',
      'dragEnd',
      'onShow',
    ]) {
      expect(typeof window[method]).toBe('function')
    }
  })

  it('icons object has get and listPacks methods', () => {
    const { icons } = getExposedCore()
    expect(typeof icons.get).toBe('function')
    expect(typeof icons.listPacks).toBe('function')
  })

  it('themes object has list method', () => {
    const { themes } = getExposedCore()
    expect(typeof themes.list).toBe('function')
  })
})

// ── B. IPC routing ───────────────────────────────────────────────────────────
// Note: we do NOT call mockClear() inside these tests so that the bootstrap
// invoke call (getPreloads) remains in mock.calls for section C assertions.

describe('core.ipc.invoke', () => {
  it('calls ipcRenderer.invoke("ext:invoke", extId, channel, payload)', () => {
    const { ipc } = getExposedCore()
    ipc.invoke('com.nuxy.calc', 'eval', { expr: '1+1' })
    expect(mockInvoke).toHaveBeenCalledWith('ext:invoke', 'com.nuxy.calc', 'eval', { expr: '1+1' })
  })
})

describe('core.window.*', () => {
  it('ready() → ipcRenderer.send("window:ready")', () => {
    const { window } = getExposedCore()
    window.ready()
    expect(mockSend).toHaveBeenCalledWith('window:ready')
  })

  it('resize(w, h) → ipcRenderer.send("window:resize", w, h)', () => {
    const { window } = getExposedCore()
    window.resize(800, 600)
    expect(mockSend).toHaveBeenCalledWith('window:resize', 800, 600)
  })

  it('hide() → ipcRenderer.send("window:hide")', () => {
    const { window } = getExposedCore()
    window.hide()
    expect(mockSend).toHaveBeenCalledWith('window:hide')
  })

  it('esc() → ipcRenderer.send("window:esc")', () => {
    const { window } = getExposedCore()
    window.esc()
    expect(mockSend).toHaveBeenCalledWith('window:esc')
  })

  it('center() → ipcRenderer.send("window:center")', () => {
    const { window } = getExposedCore()
    window.center()
    expect(mockSend).toHaveBeenCalledWith('window:center')
  })

  it('dragStart() → ipcRenderer.send("window:drag-start")', () => {
    const { window } = getExposedCore()
    window.dragStart()
    expect(mockSend).toHaveBeenCalledWith('window:drag-start')
  })

  it('dragMove() → ipcRenderer.send("window:drag-move")', () => {
    const { window } = getExposedCore()
    window.dragMove()
    expect(mockSend).toHaveBeenCalledWith('window:drag-move')
  })

  it('dragEnd() → ipcRenderer.send("window:drag-end")', () => {
    const { window } = getExposedCore()
    window.dragEnd()
    expect(mockSend).toHaveBeenCalledWith('window:drag-end')
  })

  it('setBlurSuppressed(true) → ipcRenderer.send("window:set-blur-suppressed", true)', () => {
    const { window } = getExposedCore()
    window.setBlurSuppressed(true)
    expect(mockSend).toHaveBeenCalledWith('window:set-blur-suppressed', true)
  })
})

describe('core.window.onShow', () => {
  it('registers a listener with ipcRenderer.on("window:show", ...)', () => {
    const { window } = getExposedCore()
    const callsBefore = mockOn.mock.calls.length
    const cb = vi.fn()
    window.onShow(cb)
    const newCalls = mockOn.mock.calls.slice(callsBefore)
    expect(newCalls.length).toBe(1)
    expect(newCalls[0][0]).toBe('window:show')
    expect(typeof newCalls[0][1]).toBe('function')
  })

  it('returns a cleanup function that calls ipcRenderer.off', () => {
    const { window } = getExposedCore()
    const onCallsBefore = mockOn.mock.calls.length
    const cb = vi.fn()
    const cleanup = window.onShow(cb)
    // Capture the exact listener that was registered by this call
    const registeredListener = mockOn.mock.calls[onCallsBefore][1]
    cleanup()
    expect(mockOff).toHaveBeenCalledWith('window:show', registeredListener)
  })
})

describe('core.icons', () => {
  it('get(name, pack) → ipcRenderer.invoke("ext:invoke", "kernel", "getIcon", { name, pack })', () => {
    const { icons } = getExposedCore()
    icons.get('arrow-right', 'heroicons')
    expect(mockInvoke).toHaveBeenCalledWith('ext:invoke', 'kernel', 'getIcon', {
      name: 'arrow-right',
      pack: 'heroicons',
    })
  })

  it('listPacks() → ipcRenderer.invoke("ext:invoke", "kernel", "listIconPacks", {})', () => {
    const { icons } = getExposedCore()
    icons.listPacks()
    expect(mockInvoke).toHaveBeenCalledWith('ext:invoke', 'kernel', 'listIconPacks', {})
  })
})

describe('core.themes', () => {
  it('list() → ipcRenderer.invoke("ext:invoke", "kernel", "listThemes", {})', () => {
    const { themes } = getExposedCore()
    themes.list()
    expect(mockInvoke).toHaveBeenCalledWith('ext:invoke', 'kernel', 'listThemes', {})
  })
})

describe('core.tools', () => {
  it('resolveElementTag(extId) → kernel getToolElementTag', async () => {
    mockInvoke.mockResolvedValueOnce({ success: true, data: 'nuxy-tool-color' })
    const { tools } = getExposedCore()
    const tag = await tools.resolveElementTag('com.nuxy.color')
    expect(mockInvoke).toHaveBeenCalledWith('ext:invoke', 'kernel', 'getToolElementTag', {
      extId: 'com.nuxy.color',
    })
    expect(tag).toBe('nuxy-tool-color')
  })

  it('resolveElementTag returns null when kernel call fails', async () => {
    mockInvoke.mockResolvedValueOnce({ success: false })
    const { tools } = getExposedCore()
    const tag = await tools.resolveElementTag('com.nuxy.missing')
    expect(tag).toBeNull()
  })
})

describe('core.composition', () => {
  it('declareSlots and setState notify listeners', () => {
    const { composition } = getExposedCore()
    const handler = vi.fn()
    composition.declareSlots([{ name: 'background-layer' }])
    const off = composition.onStateChange('background-layer', handler)
    composition.setState('background-layer', { active: true })
    expect(handler).toHaveBeenCalledWith({ active: true })
    off()
  })
})

describe('core.shell', () => {
  it('registerKeyActions updates snapshot', () => {
    const { shell } = getExposedCore()
    shell.registerKeyActions(() => [{ key: 'Enter', label: 'Go', handler: () => {} }])
    expect(shell.getSnapshot().keyActionHints).toHaveLength(0)
    shell.registerKeyActions(() => [{ key: 'Enter', label: 'Go', hint: '↵', handler: () => {} }])
    expect(shell.getSnapshot().keyActionHints).toHaveLength(1)
  })
})

describe('core.events', () => {
  it('emit notifies subscribers', () => {
    const { events } = getExposedCore()
    const handler = vi.fn()
    const off = events.on('shell-reset', handler)
    events.emit('shell-reset')
    expect(handler).toHaveBeenCalled()
    off()
  })
})

// ── C. Preload bootstrap sequence ────────────────────────────────────────────

describe('preload bootstrap', () => {
  it('calls ipcRenderer.invoke with "ext:invoke", "kernel", "getPreloads", {} on module load', () => {
    // mock.calls accumulates across all tests (no mockClear used above),
    // so the original bootstrap call is still present in the history.
    expect(mockInvoke).toHaveBeenCalledWith('ext:invoke', 'kernel', 'getPreloads', {})
  })

  it('sends "window:preloads-loaded" after getPreloads resolves (even when data is empty)', async () => {
    await vi.waitFor(() => {
      expect(mockSend).toHaveBeenCalledWith('window:preloads-loaded')
    })
  })
})
