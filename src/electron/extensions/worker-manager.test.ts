import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { registerExtensionByType } from './worker-manager.js'
import { registerExtensionTheme } from '../themes/extension-themes.js'
import { registerIconPack } from '../icons/registry.js'
import type { ExtensionManifest } from '@nuxyorg/core'

vi.mock('../themes/extension-themes.js', () => ({
  registerExtensionTheme: vi.fn(),
  clearExtensionThemes: vi.fn(),
}))

vi.mock('../icons/registry.js', () => ({
  registerIconPack: vi.fn(),
  clearIconRegistry: vi.fn(),
}))

const tmpDir = path.join(os.tmpdir(), 'nuxy-worker-manager-test')

function baseManifest(overrides: Partial<ExtensionManifest>): ExtensionManifest {
  return {
    id: 'com.nuxy.test',
    name: 'Test',
    version: '1.0.0',
    type: 'tool',
    ...overrides,
  } as ExtensionManifest
}

describe('registerExtensionByType', () => {
  let spawnExt: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true })
    vi.clearAllMocks()
    spawnExt = vi.fn()
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('registers a theme and does not spawn a worker', () => {
    fs.writeFileSync(path.join(tmpDir, 'theme.json'), JSON.stringify({ name: 'ocean' }))
    const manifest = baseManifest({ type: 'theme', entry: { theme: 'theme.json' } })

    registerExtensionByType(manifest, 'com.nuxy.test', 'test', tmpDir, spawnExt as any)

    expect(registerExtensionTheme).toHaveBeenCalledWith({ name: 'ocean' })
    expect(spawnExt).not.toHaveBeenCalled()
  })

  it('skips theme registration when entry.theme is missing', () => {
    const manifest = baseManifest({ type: 'theme' })

    registerExtensionByType(manifest, 'com.nuxy.test', 'test', tmpDir, spawnExt as any)

    expect(registerExtensionTheme).not.toHaveBeenCalled()
    expect(spawnExt).not.toHaveBeenCalled()
  })

  it('skips theme registration when the theme file does not exist', () => {
    const manifest = baseManifest({ type: 'theme', entry: { theme: 'missing.json' } })

    registerExtensionByType(manifest, 'com.nuxy.test', 'test', tmpDir, spawnExt as any)

    expect(registerExtensionTheme).not.toHaveBeenCalled()
  })

  it('does not throw when the theme file has invalid JSON', () => {
    fs.writeFileSync(path.join(tmpDir, 'theme.json'), '{not json')
    const manifest = baseManifest({ type: 'theme', entry: { theme: 'theme.json' } })

    expect(() =>
      registerExtensionByType(manifest, 'com.nuxy.test', 'test', tmpDir, spawnExt as any)
    ).not.toThrow()
    expect(registerExtensionTheme).not.toHaveBeenCalled()
  })

  it('registers an iconpack and does not spawn a worker', () => {
    fs.writeFileSync(path.join(tmpDir, 'icons.json'), JSON.stringify({ name: 'mdi', icons: {} }))
    const manifest = baseManifest({ type: 'iconpack', entry: { icons: 'icons.json' } })

    registerExtensionByType(manifest, 'com.nuxy.test', 'test', tmpDir, spawnExt as any)

    expect(registerIconPack).toHaveBeenCalledWith({ name: 'mdi', icons: {} })
    expect(spawnExt).not.toHaveBeenCalled()
  })

  it('skips iconpack registration when entry.icons is missing', () => {
    const manifest = baseManifest({ type: 'iconpack' })

    registerExtensionByType(manifest, 'com.nuxy.test', 'test', tmpDir, spawnExt as any)

    expect(registerIconPack).not.toHaveBeenCalled()
    expect(spawnExt).not.toHaveBeenCalled()
  })

  it('treats uikit extensions as frontend-only (no spawn)', () => {
    const manifest = baseManifest({ type: 'uikit', entry: { frontend: 'frontend.js' } })

    registerExtensionByType(manifest, 'com.nuxy.test', 'test', tmpDir, spawnExt as any)

    expect(spawnExt).not.toHaveBeenCalled()
  })

  it('spawns a worker for a helper extension with a backend entry', () => {
    const manifest = baseManifest({ type: 'helper', entry: { backend: 'backend.js' } })

    registerExtensionByType(manifest, 'com.nuxy.test', 'test', tmpDir, spawnExt as any)

    expect(spawnExt).toHaveBeenCalledWith('com.nuxy.test', 'test', 'backend.js', [])
  })

  it('does not spawn a worker for a frontend-only helper extension', () => {
    const manifest = baseManifest({ type: 'helper', entry: { frontend: 'frontend.js' } })

    registerExtensionByType(manifest, 'com.nuxy.test', 'test', tmpDir, spawnExt as any)

    expect(spawnExt).not.toHaveBeenCalled()
  })

  it('spawns a worker for a plain tool extension with permissions', () => {
    const manifest = baseManifest({
      type: 'tool',
      entry: { backend: 'backend.js' },
      permissions: ['clipboard'],
    })

    registerExtensionByType(manifest, 'com.nuxy.test', 'test', tmpDir, spawnExt as any)

    expect(spawnExt).toHaveBeenCalledWith('com.nuxy.test', 'test', 'backend.js', ['clipboard'])
  })

  it('does not spawn a worker when there is no backend entry', () => {
    const manifest = baseManifest({ type: 'tool' })

    registerExtensionByType(manifest, 'com.nuxy.test', 'test', tmpDir, spawnExt as any)

    expect(spawnExt).not.toHaveBeenCalled()
  })
})

// End-to-end registration against the real theme/icon registries (rather than
// the mocks above, which isolate dispatch logic) is covered by
// scanner.test.ts's "registerExtensionByType dispatch (via scanExtensions)" suite.
