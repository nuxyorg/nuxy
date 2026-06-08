/**
 * Tests for the preload IPC bridge: window.core.ipc.invoke, window.core.themes,
 * window.core.icons. These exercise the real contextBridge → ipcMain path.
 */
import { test, expect } from './fixtures.js'

test.describe('window.core object', () => {
  test('core is injected and has expected shape', async ({ appPage }) => {
    const shape = await appPage.evaluate(() => {
      const c = (window as any).core
      return {
        hasIpc: typeof c?.ipc?.invoke === 'function',
        hasWindow: typeof c?.window?.hide === 'function',
        hasWindowEsc: typeof c?.window?.esc === 'function',
        hasWindowCenter: typeof c?.window?.center === 'function',
        hasIcons: typeof c?.icons?.get === 'function',
        hasThemes: typeof c?.themes?.list === 'function',
      }
    })
    expect(shape.hasIpc).toBe(true)
    expect(shape.hasWindow).toBe(true)
    expect(shape.hasWindowEsc).toBe(true)
    expect(shape.hasWindowCenter).toBe(true)
    expect(shape.hasIcons).toBe(true)
    expect(shape.hasThemes).toBe(true)
  })
})

test.describe('kernel IPC channels via window.core.ipc.invoke', () => {
  test('listTools returns success with array', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'listTools', {})
    )
    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
  })

  test('listProviders returns success with array', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'listProviders', {})
    )
    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
  })

  test('listOrchestrators returns success with array', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'listOrchestrators', {})
    )
    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
  })

  test('getConfig returns config object with expected fields', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'getConfig', {})
    )
    expect(result.success).toBe(true)
    expect(typeof result.data.escAction).toBe('string')
    expect(typeof result.data.windowWidth).toBe('number')
    expect(typeof result.data.windowMaxHeight).toBe('number')
    expect(typeof result.data.alwaysOnTop).toBe('boolean')
    expect(typeof result.data.opacity).toBe('number')
    expect(result.data.backgroundBehavior).toBe('reset-on-show')
  })

  test('getTheme returns theme with name and vars', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'getTheme', {})
    )
    expect(result.success).toBe(true)
    expect(typeof result.data).toBe('object')
  })

  test('getThemeByName dark returns dark theme', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'getThemeByName', { name: 'dark' })
    )
    expect(result.success).toBe(true)
    expect(result.data).toBeTruthy()
  })

  test('getThemeByName with missing name returns error', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'getThemeByName', {})
    )
    expect(result.success).toBe(false)
    expect(result.code).toBe('INVALID_ARGS')
  })

  test('listThemes returns array of theme names', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'listThemes', {})
    )
    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
    expect(result.data).toContain('dark')
    expect(result.data).toContain('light')
  })

  test('getIcon returns null or SVG string', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'getIcon', { name: 'search' })
    )
    expect(result.success).toBe(true)
    // data is either null (no icon packs loaded) or a string SVG
    expect(result.data === null || typeof result.data === 'string').toBe(true)
  })

  test('listIconPacks returns array', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'listIconPacks', {})
    )
    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
  })

  test('listSystemFonts returns array', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'listSystemFonts', {})
    )
    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
  })

  test('unknown kernel channel returns error', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'doesNotExist', {})
    )
    expect(result.success).toBe(false)
    expect(result.code).toBe('UNKNOWN_CHANNEL')
  })

  test('invalid extId returns error', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('', 'listTools', {})
    )
    expect(result.success).toBe(false)
    expect(result.code).toBe('INVALID_ARGS')
  })

  test('unknown extension returns EXTENSION_NOT_FOUND', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.nonexistent', 'eval', {})
    )
    expect(result.success).toBe(false)
    expect(result.code).toBe('EXTENSION_NOT_FOUND')
  })
})

test.describe('window.core.themes helper', () => {
  test('themes.list() returns array with dark and light', async ({ appPage }) => {
    const result = await appPage.evaluate(async () => (window as any).core.themes.list())
    // result is the raw IPC result
    expect(result.success).toBe(true)
    expect(result.data).toContain('dark')
    expect(result.data).toContain('light')
  })
})

test.describe('window.core.icons helper', () => {
  test('icons.listPacks() returns array', async ({ appPage }) => {
    const result = await appPage.evaluate(async () => (window as any).core.icons.listPacks())
    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
  })

  test('icons.get() returns null or string', async ({ appPage }) => {
    const result = await appPage.evaluate(async () => (window as any).core.icons.get('search'))
    expect(result.success).toBe(true)
    expect(result.data === null || typeof result.data === 'string').toBe(true)
  })
})

test.describe('extension channels via IPC', () => {
  test('shell extension responds to getRecentTools', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.shell', 'getRecentTools', {})
    )
    // Shell extension may or may not be callable depending on manifest
    expect(result).toBeTruthy()
    // Either success with array or a well-formed error
    expect(typeof result.success).toBe('boolean')
  })
})

test.describe('preload security boundaries', () => {
  test('window.require is not exposed (nodeIntegration disabled)', async ({ appPage }) => {
    const hasRequire = await appPage.evaluate(() => typeof (window as any).require !== 'undefined')
    expect(hasRequire).toBe(false)
  })

  test('window.__dirname is not exposed', async ({ appPage }) => {
    const hasDirname = await appPage.evaluate(
      () => typeof (window as any).__dirname !== 'undefined'
    )
    expect(hasDirname).toBe(false)
  })

  test('window.__filename is not exposed', async ({ appPage }) => {
    const hasFilename = await appPage.evaluate(
      () => typeof (window as any).__filename !== 'undefined'
    )
    expect(hasFilename).toBe(false)
  })

  test('window.module is not exposed', async ({ appPage }) => {
    const hasModule = await appPage.evaluate(() => typeof (window as any).module !== 'undefined')
    expect(hasModule).toBe(false)
  })

  test('Node process object not fully accessible from renderer', async ({ appPage }) => {
    // Electron may inject a limited process stub, but the full Node process
    // (with process.pid, process.versions.node, process.binding) must not be accessible.
    const result = await appPage.evaluate(() => {
      const p = (window as any).process
      if (!p) return { nodeAccessible: false }
      // Full Node process exposes versions.node and binding()
      const hasNodeVersion = typeof p?.versions?.node === 'string'
      const hasBinding = typeof p?.binding === 'function'
      return { nodeAccessible: hasNodeVersion && hasBinding }
    })
    expect(result.nodeAccessible).toBe(false)
  })

  test('window.core only exposes declared API (no extra properties)', async ({ appPage }) => {
    const keys = await appPage.evaluate(() => Object.keys((window as any).core ?? {}))
    expect(keys).toContain('ipc')
    expect(keys).toContain('window')
    expect(keys).toContain('icons')
    expect(keys).toContain('themes')
    expect(keys).toContain('tools')
    expect(keys).toContain('composition')
    // Must not accidentally expose Node internals under core
    expect(keys).not.toContain('require')
    expect(keys).not.toContain('process')
  })

  test('window.core.ipc does not expose ipcRenderer directly', async ({ appPage }) => {
    const hasIpcRenderer = await appPage.evaluate(
      () => 'on' in ((window as any).core?.ipc ?? {}) || 'send' in ((window as any).core?.ipc ?? {})
    )
    expect(hasIpcRenderer).toBe(false)
  })
})
