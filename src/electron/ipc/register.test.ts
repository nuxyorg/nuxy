import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerIpc } from './register.js'
import { ipcMain } from 'electron'
import { loadedExtensions } from '../extensions/scanner.js'
import { invokeRescan } from '../extensions/rescan-hook.js'
import type { LoadedExtension } from '@nuxy/core'
import fs from 'fs'
import path from 'path'

const mockHandlers: Record<string, Function> = {}

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: Function) => {
      mockHandlers[channel] = handler
    }),
    on: vi.fn(),
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
    fromWebContents: vi.fn(),
  },
  screen: {
    getCursorScreenPoint: vi.fn(() => ({ x: 0, y: 0 })),
  },
  app: {
    quit: vi.fn(),
  },
}))

vi.mock('../extensions/scanner.js', () => ({
  loadedExtensions: [],
  rescanExtensions: vi.fn(async () => {}),
}))

vi.mock('../extensions/rescan-hook.js', () => ({
  invokeRescan: vi.fn(async () => {}),
}))

vi.mock('../extensions/registry.js', () => ({
  getDisplayName: vi.fn((ext) => ext.manifest.name),
  isBootstrapExtension: vi.fn((ext) => ext.manifest.bootstrap === true),
}))

vi.mock('../config/nuxyconfig.js', () => ({
  getConfig: vi.fn(() => ({})),
}))

vi.mock('../themes/install.js', () => ({
  loadTheme: vi.fn(() => ({})),
}))

vi.mock('../themes/extension-themes.js', () => ({
  listExtensionThemeNames: vi.fn(() => []),
}))

vi.mock('../icons/registry.js', () => ({
  getIcon: vi.fn(() => null),
  listIconPacks: vi.fn(() => []),
}))

vi.mock('../window/spring.js', () => ({
  getOrCreateSpring: vi.fn(),
}))

vi.mock('../window/runtime.js', () => ({
  positionWindowOnDisplay: vi.fn(),
  applyConfigToWindow: vi.fn(),
}))

vi.mock('./worker-invoke.js', () => ({
  invokeWorker: vi.fn(),
}))

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => false),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    renameSync: vi.fn(),
    rmSync: vi.fn(),
    chmodSync: vi.fn(),
  },
}))

describe('registerIpc - Store Channels', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadedExtensions.length = 0
    registerIpc()
  })

  it('registers ext:invoke handler', () => {
    expect(ipcMain.handle).toHaveBeenCalledWith('ext:invoke', expect.any(Function))
  })

  it('listTools uses runtime registeredEntries instead of hardcoded ids', async () => {
    const handler = mockHandlers['ext:invoke']
    const ext: LoadedExtension = {
      id: 'com.example.dual',
      folderName: 'dual',
      manifest: { id: 'com.example.dual', name: 'Dual', version: '1.0.0', type: 'provider' },
      runtime: {
        ipcChannels: ['eval'],
        registeredEntries: [
          { kind: 'tool', name: 'dual' },
          { kind: 'provider', name: 'dual' },
        ],
      },
    }
    loadedExtensions.push(ext)

    const tools = await handler(null, 'kernel', 'listTools', {})
    const providers = await handler(null, 'kernel', 'listProviders', {})
    expect(tools.success).toBe(true)
    expect(providers.success).toBe(true)
    expect(tools.data.map((e: LoadedExtension) => e.id)).toContain('com.example.dual')
    expect(providers.data.map((e: LoadedExtension) => e.id)).toContain('com.example.dual')
  })

  it('listInstalledExtensions returns all loaded extensions', async () => {
    const handler = mockHandlers['ext:invoke']
    const ext: LoadedExtension = {
      id: 'com.nuxy.test-ext',
      folderName: 'test-ext',
      manifest: { id: 'com.nuxy.test-ext', name: 'Test Ext', version: '1.0.0', type: 'tool' },
    }
    loadedExtensions.push(ext)

    const result = await handler(null, 'kernel', 'listInstalledExtensions', {})
    expect(result.success).toBe(true)
    expect(result.data).toContainEqual(ext)
  })

  it('uninstallExtension rejects uninstalling bootstrap/system extensions', async () => {
    const handler = mockHandlers['ext:invoke']
    const shellExt: LoadedExtension = {
      id: 'com.nuxy.shell',
      folderName: 'shell',
      manifest: {
        id: 'com.nuxy.shell',
        name: 'Shell',
        version: '1.0.0',
        type: 'uikit',
        bootstrap: true,
      },
    }
    loadedExtensions.push(shellExt)

    const result = await handler(null, 'kernel', 'uninstallExtension', { extId: 'com.nuxy.shell' })
    expect(result.success).toBe(false)
    expect(result.code).toBe('FORBIDDEN')
  })

  it('uninstallExtension deletes extension file and triggers rescan', async () => {
    const handler = mockHandlers['ext:invoke']
    const ext: LoadedExtension = {
      id: 'com.nuxy.uninstall-me',
      folderName: 'uninstall-me',
      manifest: {
        id: 'com.nuxy.uninstall-me',
        name: 'Uninstall Me',
        version: '1.0.0',
        type: 'tool',
      },
    }
    loadedExtensions.push(ext)

    vi.mocked(fs.existsSync).mockReturnValue(true)

    const result = await handler(null, 'kernel', 'uninstallExtension', {
      extId: 'com.nuxy.uninstall-me',
    })
    expect(result.success).toBe(true)
    expect(fs.rmSync).toHaveBeenCalled()
    expect(invokeRescan).not.toHaveBeenCalled() // Triggers in setTimeout

    // Wait for the invokeRescan setTimeout to fire
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(invokeRescan).toHaveBeenCalled()
  })

  it('installExtension downloads zip, writes file, and triggers rescan', async () => {
    const handler = mockHandlers['ext:invoke']

    // Mock the global fetch
    const mockArrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8))
    const mockResponse = {
      ok: true,
      arrayBuffer: mockArrayBuffer,
    }
    const globalFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as any)

    const result = await handler(null, 'kernel', 'installExtension', {
      extId: 'com.nuxy.new-ext',
      downloadUrl: 'https://example.com/new-ext.nuxyext',
    })

    expect(result.success).toBe(true)
    expect(globalFetch).toHaveBeenCalledWith('https://example.com/new-ext.nuxyext')
    expect(fs.writeFileSync).toHaveBeenCalled()
    expect(fs.renameSync).toHaveBeenCalled()

    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(invokeRescan).toHaveBeenCalled()

    globalFetch.mockRestore()
  })
})
