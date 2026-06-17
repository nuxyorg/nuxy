import { vi } from 'vitest'

/**
 * Default electron stub for unit tests. Electron's package entry reads
 * path.txt at import time, which is absent when the binary was not
 * downloaded (e.g. CI without postinstall). Tests that need specific
 * behaviour can override with their own vi.mock('electron', …).
 */
vi.mock('electron', () => {
  const app = {
    getLocale: vi.fn(() => 'en'),
    quit: vi.fn(),
    getPath: vi.fn(() => '/tmp'),
  }

  const electron = {
    app,
    ipcMain: {
      handle: vi.fn(),
      on: vi.fn(),
    },
    ipcRenderer: {
      invoke: vi.fn(),
      on: vi.fn(),
    },
    contextBridge: {
      exposeInMainWorld: vi.fn(),
    },
    BrowserWindow: Object.assign(vi.fn(), {
      getAllWindows: vi.fn(() => []),
      fromWebContents: vi.fn(),
    }),
    dialog: {
      showMessageBox: vi.fn(),
      showMessageBoxSync: vi.fn((win: unknown) => {
        if (!win) throw new Error('No BrowserWindow to show dialog')
        return 0
      }),
    },
    protocol: {
      registerSchemesAsPrivileged: vi.fn(),
      registerBufferProtocol: vi.fn(),
      handle: vi.fn(),
    },
    net: {
      fetch: vi.fn(),
    },
    clipboard: {
      readText: vi.fn(),
      writeText: vi.fn(),
    },
    nativeImage: {
      createFromBuffer: vi.fn(),
    },
    screen: {
      getCursorScreenPoint: vi.fn(() => ({ x: 0, y: 0 })),
      getPrimaryDisplay: vi.fn(() => ({ workAreaSize: { width: 1920, height: 1080 } })),
    },
  }

  return { ...electron, default: electron }
})
