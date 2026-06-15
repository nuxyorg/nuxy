/**
 * Unit-style tests for kernel IPC validation, broker, and registry logic.
 * These run without launching the Electron app.
 */
import { test, expect } from '@playwright/test'
import { electronRequire } from './electron-require.js'
import type { LoadedExtension } from '@nuxy/core'

const { validateExtInvokeArgs, validateWindowResize } = electronRequire(
  '../electron/ipc/validate.js'
)
const {
  clearRegistry,
  registerExtension,
  setExtensionChannels,
  getExtensionById,
  isChannelAllowed,
  mergeRuntimeSync,
  getDisplayName,
  resolveExtensionId,
  loadedExtensions,
} = electronRequire('../electron/extensions/registry.js')
const { resolveStoragePath } = electronRequire('../electron/config/storage-path.js')

const makeTool = (id: string, folder = id): LoadedExtension => ({
  id,
  folderName: folder,
  manifest: { id, name: id, version: '1.0.0', type: 'tool' },
})

test.describe('validateExtInvokeArgs — kernel channels', () => {
  test.beforeEach(() => clearRegistry())

  test('allows listTools', () => {
    expect(validateExtInvokeArgs('kernel', 'listTools', {}).ok).toBe(true)
  })

  test('allows listProviders', () => {
    expect(validateExtInvokeArgs('kernel', 'listProviders', {}).ok).toBe(true)
  })

  test('allows listOrchestrators', () => {
    expect(validateExtInvokeArgs('kernel', 'listOrchestrators', {}).ok).toBe(true)
  })

  test('allows getConfig', () => {
    expect(validateExtInvokeArgs('kernel', 'getConfig', null).ok).toBe(true)
  })

  test('allows applyWindowSettings', () => {
    expect(validateExtInvokeArgs('kernel', 'applyWindowSettings', {}).ok).toBe(true)
  })

  test('allows getTheme', () => {
    expect(validateExtInvokeArgs('kernel', 'getTheme', null).ok).toBe(true)
  })

  test('allows getThemeByName', () => {
    expect(validateExtInvokeArgs('kernel', 'getThemeByName', { name: 'dark' }).ok).toBe(true)
  })

  test('allows listThemes', () => {
    expect(validateExtInvokeArgs('kernel', 'listThemes', null).ok).toBe(true)
  })

  test('allows getIcon', () => {
    expect(validateExtInvokeArgs('kernel', 'getIcon', { name: 'search' }).ok).toBe(true)
  })

  test('allows listIconPacks', () => {
    expect(validateExtInvokeArgs('kernel', 'listIconPacks', null).ok).toBe(true)
  })

  test('allows listSystemFonts', () => {
    expect(validateExtInvokeArgs('kernel', 'listSystemFonts', null).ok).toBe(true)
  })

  test('rejects unknown kernel channel', () => {
    const r = validateExtInvokeArgs('kernel', 'destroyEverything', {})
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.result.code).toBe('UNKNOWN_CHANNEL')
  })

  test('rejects non-object kernel payload', () => {
    const r = validateExtInvokeArgs('kernel', 'getConfig', 'bad-string')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.result.code).toBe('INVALID_ARGS')
  })

  test('allows null payload for kernel channels', () => {
    expect(validateExtInvokeArgs('kernel', 'getConfig', null).ok).toBe(true)
  })

  test('allows undefined payload for kernel channels', () => {
    expect(validateExtInvokeArgs('kernel', 'getConfig', undefined).ok).toBe(true)
  })

  test('rejects empty extId', () => {
    const r = validateExtInvokeArgs('', 'getConfig', {})
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.result.code).toBe('INVALID_ARGS')
  })

  test('rejects whitespace extId', () => {
    const r = validateExtInvokeArgs('   ', 'getConfig', {})
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.result.code).toBe('INVALID_ARGS')
  })

  test('rejects empty channel', () => {
    const r = validateExtInvokeArgs('kernel', '', {})
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.result.code).toBe('INVALID_ARGS')
  })
})

test.describe('validateExtInvokeArgs — extension channels', () => {
  const ext = makeTool('com.nuxy.test', 'test')

  test.beforeEach(() => {
    clearRegistry()
    registerExtension(ext)
    setExtensionChannels('com.nuxy.test', ['getHistory', 'search'])
  })

  test('allows registered channel', () => {
    expect(validateExtInvokeArgs('com.nuxy.test', 'getHistory', {}).ok).toBe(true)
  })

  test('rejects unregistered channel', () => {
    const r = validateExtInvokeArgs('com.nuxy.test', 'secret', {})
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.result.code).toBe('UNKNOWN_CHANNEL')
  })

  test('rejects unknown extension', () => {
    const r = validateExtInvokeArgs('com.nuxy.gone', 'getHistory', {})
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.result.code).toBe('EXTENSION_NOT_FOUND')
  })

  test('trims whitespace from extId and channel', () => {
    expect(validateExtInvokeArgs('  com.nuxy.test  ', '  getHistory  ', {}).ok).toBe(true)
  })
})

test.describe('validateWindowResize', () => {
  test('accepts positive integers', () => {
    const r = validateWindowResize(800, 600)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.width).toBe(800)
      expect(r.height).toBe(600)
    }
  })

  test('accepts floats', () => {
    expect(validateWindowResize(800.5, 600.5).ok).toBe(true)
  })

  test('rejects NaN width', () => {
    expect(validateWindowResize(NaN, 600).ok).toBe(false)
  })

  test('rejects NaN height', () => {
    expect(validateWindowResize(800, NaN).ok).toBe(false)
  })

  test('rejects Infinity', () => {
    expect(validateWindowResize(Infinity, 600).ok).toBe(false)
  })

  test('rejects string dimensions', () => {
    expect(validateWindowResize('800' as any, 600).ok).toBe(false)
  })

  test('rejects null', () => {
    expect(validateWindowResize(null as any, null as any).ok).toBe(false)
  })
})

test.describe('registry', () => {
  test.beforeEach(() => clearRegistry())

  test('registers and retrieves extension by id', () => {
    const ext = makeTool('com.nuxy.a')
    registerExtension(ext)
    expect(getExtensionById('com.nuxy.a')).toBe(ext)
  })

  test('resolves id by folder name', () => {
    registerExtension(makeTool('com.nuxy.b', 'b-folder'))
    expect(resolveExtensionId('b-folder')).toBe('com.nuxy.b')
  })

  test('loadedExtensions tracks all registered extensions', () => {
    registerExtension(makeTool('com.nuxy.c'))
    registerExtension(makeTool('com.nuxy.d'))
    expect(loadedExtensions).toHaveLength(2)
  })

  test('clearRegistry empties all maps', () => {
    registerExtension(makeTool('com.nuxy.e'))
    clearRegistry()
    expect(loadedExtensions).toHaveLength(0)
    expect(getExtensionById('com.nuxy.e')).toBeUndefined()
  })

  test('isChannelAllowed works after setExtensionChannels', () => {
    registerExtension(makeTool('com.nuxy.f'))
    setExtensionChannels('com.nuxy.f', ['eval', 'search'])
    expect(isChannelAllowed('com.nuxy.f', 'eval')).toBe(true)
    expect(isChannelAllowed('com.nuxy.f', 'search')).toBe(true)
    expect(isChannelAllowed('com.nuxy.f', 'other')).toBe(false)
  })

  test('mergeRuntimeSync updates display name and channels', () => {
    const ext = makeTool('com.nuxy.g')
    registerExtension(ext)
    mergeRuntimeSync('com.nuxy.g', { displayName: 'Pretty G', ipcChannels: ['doThing'] })
    const loaded = getExtensionById('com.nuxy.g')!
    expect(getDisplayName(loaded)).toBe('Pretty G')
    expect(isChannelAllowed('com.nuxy.g', 'doThing')).toBe(true)
  })

  test('getDisplayName falls back to manifest name', () => {
    const ext = makeTool('com.nuxy.h')
    registerExtension(ext)
    expect(getDisplayName(ext)).toBe('com.nuxy.h')
  })
})

test.describe('resolveStoragePath', () => {
  const base = '/home/user/.nxy/data/com.nuxy.test'

  test('resolves file inside the directory', () => {
    const r = resolveStoragePath(base, 'data.json')
    expect(r).toContain('data.json')
    expect(r).toContain(base)
  })

  test('blocks parent traversal with ../', () => {
    expect(() => resolveStoragePath(base, '../../../etc/shadow')).toThrow(/Path traversal/)
  })

  test('blocks absolute path outside base', () => {
    expect(() => resolveStoragePath(base, '/etc/passwd')).toThrow(/Path traversal/)
  })

  test('allows nested paths inside base', () => {
    const r = resolveStoragePath(base, 'cache/foo.db')
    expect(r).toContain('cache/foo.db')
  })
})
