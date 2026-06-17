// fallow-ignore-file code-duplication
/* cspell:ignore myextension */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { detectNodeImports } from './scanner.js'
import { createCoreProxy } from '../../../packages/extension-host/src/core-proxy.js'

const mockHome = path.join(os.tmpdir(), 'nuxy-scanner-test-home')

vi.mock('../config/paths.js', () => {
  const os = require('os')
  const path = require('path')
  const mockHome = path.join(os.tmpdir(), 'nuxy-scanner-test-home')
  return {
    CONFIG_DIR: mockHome,
    DATA_DIR: path.join(mockHome, 'data'),
    EXTRACTED_DIR: path.join(mockHome, 'extracted'),
    EXTENSION_DIR: path.join(mockHome, 'extensions'),
  }
})

vi.mock('../spawn/spawn.js', () => {
  return {
    spawnExtension: vi.fn(),
    activeWorkers: new Map(),
  }
})

vi.mock('../security/security.js', () => {
  return {
    loadStateCache: vi.fn().mockReturnValue({}),
    saveStateCache: vi.fn(),
    isKeyTrusted: vi.fn().mockReturnValue(true),
    addTrustedKey: vi.fn(),
    isRevoked: vi.fn().mockReturnValue(false),
    verifyDirectoryIntegrity: vi.fn().mockReturnValue({
      success: true,
      publicKey: 'mock-public-key',
      hash: 'mock-hash',
    }),
    makeDirectoryReadOnly: vi.fn(),
    updateRevocationList: vi.fn().mockResolvedValue(undefined),
  }
})

vi.mock('../window/manager.js', () => ({
  getMainWindow: vi.fn().mockReturnValue(null),
}))

vi.mock('./seed-bundled.js', () => ({
  seedBundledExtensions: vi.fn(),
}))

describe('Extension Scanner Security', () => {
  describe('detectNodeImports', () => {
    it('should detect standard imports', () => {
      const code = `import fs from 'fs';`
      expect(detectNodeImports(code)).toEqual(['fs'])
    })

    it('should detect node: prefixed imports', () => {
      const code = `import fs from 'node:fs/promises';`
      expect(detectNodeImports(code)).toEqual(['node:fs/promises'])
    })

    it('should detect require calls', () => {
      const code = `const child = require('child_process');`
      expect(detectNodeImports(code)).toEqual(['child_process'])
    })

    it('should detect dynamic imports', () => {
      const code = `const fs = await import('fs');`
      expect(detectNodeImports(code)).toEqual(['fs'])
    })

    it('should ignore comments', () => {
      const code = `
        // import fs from 'fs';
        /* const path = require('path'); */
        const x = 5;
      `
      expect(detectNodeImports(code)).toEqual([])
    })

    it('should ignore non-node imports', () => {
      const code = `import { useState } from 'react';`
      expect(detectNodeImports(code)).toEqual([])
    })
  })
})

describe('Runtime Permission Enforcement', () => {
  const callHost = vi.fn().mockResolvedValue(null)
  const logger = {
    silly: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  }
  const registerIpcHandler = vi.fn()

  it('should allow clipboard calls when clipboard permission is present', async () => {
    const { core } = createCoreProxy(callHost, logger as any, registerIpcHandler, 'test-ext', [
      'clipboard',
    ])
    await expect(core.clipboard.readText()).resolves.toBeNull()
  })

  it('should deny clipboard calls when clipboard permission is missing', async () => {
    const { core } = createCoreProxy(callHost, logger as any, registerIpcHandler, 'test-ext', [])
    expect(() => core.clipboard.readText()).toThrow(/lacks "clipboard" permission/)
  })

  it('should allow fs calls when fs permission is present', async () => {
    const { core } = createCoreProxy(callHost, logger as any, registerIpcHandler, 'test-ext', [
      'fs',
    ])
    await expect(core.fs.fileExists('foo')).resolves.toBeNull()
  })

  it('should deny fs calls when fs permission is missing', async () => {
    const { core } = createCoreProxy(callHost, logger as any, registerIpcHandler, 'test-ext', [])
    expect(() => core.fs.fileExists('foo')).toThrow(/lacks "fs" permission/)
  })

  it('should allow db open when db permission is present', () => {
    const { core } = createCoreProxy(callHost, logger as any, registerIpcHandler, 'test-ext', [
      'db',
    ])
    const db = core.db.open('foo')
    expect(db).toBeDefined()
  })

  it('should deny db open when db permission is missing', () => {
    const { core } = createCoreProxy(callHost, logger as any, registerIpcHandler, 'test-ext', [])
    expect(() => core.db.open('foo')).toThrow(/lacks "db" permission/)
  })
})

import { scanExtensions } from './scanner.js'
import { spawnExtension } from '../spawn/spawn.js'
import { listExtensionThemeNames, getExtensionTheme } from '../themes/extension-themes.js'
import { listIconPacks, getIconPack } from '../icons/registry.js'
import { getExtensionById } from './registry.js'
import {
  isKeyTrusted,
  isRevoked,
  verifyDirectoryIntegrity,
  makeDirectoryReadOnly,
} from '../security/security.js'
import { getMainWindow } from '../window/manager.js'

describe('scanExtensions directory scanning', () => {
  const EXTRACTED_DIR = path.join(mockHome, 'extracted')
  const EXTENSION_DIR = path.join(mockHome, 'extensions')

  beforeEach(() => {
    fs.mkdirSync(mockHome, { recursive: true })
    fs.mkdirSync(EXTRACTED_DIR, { recursive: true })
    fs.mkdirSync(EXTENSION_DIR, { recursive: true })
    vi.clearAllMocks()
    vi.mocked(isKeyTrusted).mockReturnValue(true)
    vi.mocked(isRevoked).mockReturnValue(false)
    vi.mocked(verifyDirectoryIntegrity).mockReturnValue({
      success: true,
      publicKey: 'mock-public-key',
      hash: 'mock-hash',
    })
  })

  afterEach(() => {
    fs.rmSync(mockHome, { recursive: true, force: true })
  })

  it('should not register .tmp_ folders during the registration scan', async () => {
    // Simulate a .tmp_ folder left over from a crashed previous extraction
    const tempExtDir = path.join(EXTRACTED_DIR, '.tmp_com.nuxy.myextension')
    fs.mkdirSync(tempExtDir, { recursive: true })
    fs.writeFileSync(
      path.join(tempExtDir, 'manifest.json'),
      JSON.stringify({
        id: 'com.nuxy.myextension',
        name: 'My Extension',
        version: '1.0.0',
        entry: { backend: 'backend.js' },
      })
    )

    await scanExtensions()

    // .tmp_ folder should not be registered or spawned
    expect(spawnExtension).not.toHaveBeenCalled()
  })

  it('should clean up stale .tmp_ folders during the stale-folder cleanup phase', async () => {
    // Create a .tmp_ folder in EXTRACTED_DIR with no corresponding EXTENSION_DIR item
    const tempExtDir = path.join(EXTRACTED_DIR, '.tmp_com.nuxy.myextension')
    fs.mkdirSync(tempExtDir, { recursive: true })
    fs.writeFileSync(
      path.join(tempExtDir, 'manifest.json'),
      JSON.stringify({
        id: 'com.nuxy.myextension',
        name: 'My Extension',
        version: '1.0.0',
        entry: { backend: 'backend.js' },
      })
    )

    await scanExtensions()

    // The .tmp_ folder should have been cleaned up
    expect(fs.existsSync(tempExtDir)).toBe(false)
  })

  it('should register an extension once even when a .tmp_ leftover coexists with the valid cached folder', async () => {
    // Create valid extension in EXTENSION_DIR so it is processed and added to activeFolders
    const extInDir = path.join(EXTENSION_DIR, 'com.nuxy.myextension')
    fs.mkdirSync(extInDir, { recursive: true })
    fs.writeFileSync(
      path.join(extInDir, 'manifest.json'),
      JSON.stringify({
        id: 'com.nuxy.myextension',
        name: 'My Extension',
        version: '1.0.0',
        entry: { backend: 'backend.js' },
      })
    )

    // Simulate a leftover .tmp_ folder from a previous crashed scan
    const tempExtDir = path.join(EXTRACTED_DIR, '.tmp_com.nuxy.myextension')
    fs.mkdirSync(tempExtDir, { recursive: true })
    fs.writeFileSync(
      path.join(tempExtDir, 'manifest.json'),
      JSON.stringify({
        id: 'com.nuxy.myextension',
        name: 'My Extension',
        version: '1.0.0',
        entry: { backend: 'backend.js' },
      })
    )

    await scanExtensions()

    // spawnExtension should be called exactly once with the correct folder name
    expect(spawnExtension).toHaveBeenCalledTimes(1)
    expect(spawnExtension).toHaveBeenCalledWith(
      'com.nuxy.myextension',
      'com.nuxy.myextension',
      'backend.js',
      []
    )
  })
})

describe('registerExtensionByType dispatch (via scanExtensions)', () => {
  const EXTRACTED_DIR = path.join(mockHome, 'extracted')
  const EXTENSION_DIR = path.join(mockHome, 'extensions')

  beforeEach(() => {
    fs.mkdirSync(mockHome, { recursive: true })
    fs.mkdirSync(EXTRACTED_DIR, { recursive: true })
    fs.mkdirSync(EXTENSION_DIR, { recursive: true })
    vi.clearAllMocks()
    vi.mocked(isKeyTrusted).mockReturnValue(true)
    vi.mocked(isRevoked).mockReturnValue(false)
    vi.mocked(verifyDirectoryIntegrity).mockReturnValue({
      success: true,
      publicKey: 'mock-public-key',
      hash: 'mock-hash',
    })
  })

  afterEach(() => {
    fs.rmSync(mockHome, { recursive: true, force: true })
  })

  function writeExtension(
    folderName: string,
    manifest: Record<string, unknown>,
    extraFiles?: Record<string, string>
  ) {
    const dir = path.join(EXTENSION_DIR, folderName)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest))
    for (const [name, content] of Object.entries(extraFiles ?? {})) {
      fs.writeFileSync(path.join(dir, name), content)
    }
  }

  it('registers a theme extension and does not spawn a worker', async () => {
    writeExtension(
      'com.nuxy.themepack',
      {
        id: 'com.nuxy.themepack',
        name: 'Theme Pack',
        version: '1.0.0',
        type: 'theme',
        entry: { theme: 'theme.json' },
      },
      { 'theme.json': JSON.stringify({ name: 'ocean', colors: {} }) }
    )

    await scanExtensions()

    expect(spawnExtension).not.toHaveBeenCalled()
    expect(listExtensionThemeNames()).toContain('ocean')
    expect(getExtensionTheme('ocean')).toBeDefined()
  })

  it('skips a theme extension with no entry.theme', async () => {
    writeExtension('com.nuxy.badtheme', {
      id: 'com.nuxy.badtheme',
      name: 'Bad Theme',
      version: '1.0.0',
      type: 'theme',
    })

    await scanExtensions()

    expect(spawnExtension).not.toHaveBeenCalled()
    expect(listExtensionThemeNames()).toEqual([])
  })

  it('registers an iconpack extension and does not spawn a worker', async () => {
    writeExtension(
      'com.nuxy.iconpack',
      {
        id: 'com.nuxy.iconpack',
        name: 'Icon Pack',
        version: '1.0.0',
        type: 'iconpack',
        entry: { icons: 'icons.json' },
      },
      { 'icons.json': JSON.stringify({ name: 'mdi', icons: { home: '<svg/>' } }) }
    )

    await scanExtensions()

    expect(spawnExtension).not.toHaveBeenCalled()
    expect(listIconPacks()).toContain('mdi')
    expect(getIconPack('mdi')).toBeDefined()
  })

  it('skips an iconpack extension with no entry.icons', async () => {
    writeExtension('com.nuxy.badicons', {
      id: 'com.nuxy.badicons',
      name: 'Bad Icons',
      version: '1.0.0',
      type: 'iconpack',
    })

    await scanExtensions()

    expect(spawnExtension).not.toHaveBeenCalled()
    expect(listIconPacks()).toEqual([])
  })

  it('registers a uikit extension without spawning a worker', async () => {
    writeExtension('com.nuxy.uikit', {
      id: 'com.nuxy.uikit',
      name: 'UI Kit',
      version: '1.0.0',
      type: 'uikit',
      entry: { frontend: 'frontend.js' },
    })

    await scanExtensions()

    expect(spawnExtension).not.toHaveBeenCalled()
    expect(getExtensionById('com.nuxy.uikit')).toBeDefined()
  })

  it('spawns a worker for a helper extension with a backend entry', async () => {
    writeExtension('com.nuxy.helper', {
      id: 'com.nuxy.helper',
      name: 'Helper',
      version: '1.0.0',
      type: 'helper',
      entry: { backend: 'backend.js' },
    })

    await scanExtensions()

    expect(spawnExtension).toHaveBeenCalledWith(
      'com.nuxy.helper',
      'com.nuxy.helper',
      'backend.js',
      []
    )
  })

  it('registers a frontend-only helper extension without spawning a worker', async () => {
    writeExtension('com.nuxy.helperfe', {
      id: 'com.nuxy.helperfe',
      name: 'Helper FE',
      version: '1.0.0',
      type: 'helper',
      entry: { frontend: 'frontend.js' },
    })

    await scanExtensions()

    expect(spawnExtension).not.toHaveBeenCalled()
    expect(getExtensionById('com.nuxy.helperfe')).toBeDefined()
  })

  it('spawns a worker for a plain tool extension with a backend entry', async () => {
    writeExtension('com.nuxy.tool', {
      id: 'com.nuxy.tool',
      name: 'Tool',
      version: '1.0.0',
      type: 'tool',
      entry: { backend: 'backend.js' },
      permissions: ['clipboard'],
    })

    await scanExtensions()

    expect(spawnExtension).toHaveBeenCalledWith('com.nuxy.tool', 'com.nuxy.tool', 'backend.js', [
      'clipboard',
    ])
  })

  it('skips a tool extension with no backend entry', async () => {
    writeExtension('com.nuxy.nobackend', {
      id: 'com.nuxy.nobackend',
      name: 'No Backend',
      version: '1.0.0',
      type: 'tool',
    })

    await scanExtensions()

    expect(spawnExtension).not.toHaveBeenCalled()
    expect(getExtensionById('com.nuxy.nobackend')).toBeDefined()
  })
})

describe('manifest validation failures (via scanExtensions)', () => {
  const EXTRACTED_DIR = path.join(mockHome, 'extracted')
  const EXTENSION_DIR = path.join(mockHome, 'extensions')

  beforeEach(() => {
    fs.mkdirSync(mockHome, { recursive: true })
    fs.mkdirSync(EXTRACTED_DIR, { recursive: true })
    fs.mkdirSync(EXTENSION_DIR, { recursive: true })
    vi.clearAllMocks()
    vi.mocked(isKeyTrusted).mockReturnValue(true)
    vi.mocked(isRevoked).mockReturnValue(false)
    vi.mocked(verifyDirectoryIntegrity).mockReturnValue({
      success: true,
      publicKey: 'mock-public-key',
      hash: 'mock-hash',
    })
  })

  afterEach(() => {
    fs.rmSync(mockHome, { recursive: true, force: true })
  })

  it('rejects a manifest with a non-array permissions field', async () => {
    const dir = path.join(EXTENSION_DIR, 'com.nuxy.badperm')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(
      path.join(dir, 'manifest.json'),
      JSON.stringify({
        id: 'com.nuxy.badperm',
        name: 'Bad Perm',
        version: '1.0.0',
        entry: { backend: 'backend.js' },
        permissions: 'clipboard',
      })
    )

    await scanExtensions()

    expect(spawnExtension).not.toHaveBeenCalled()
    expect(getExtensionById('com.nuxy.badperm')).toBeUndefined()
  })

  it('rejects a manifest with an unknown permission string', async () => {
    const dir = path.join(EXTENSION_DIR, 'com.nuxy.unknownperm')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(
      path.join(dir, 'manifest.json'),
      JSON.stringify({
        id: 'com.nuxy.unknownperm',
        name: 'Unknown Perm',
        version: '1.0.0',
        entry: { backend: 'backend.js' },
        permissions: ['nuke-everything'],
      })
    )

    await scanExtensions()

    expect(spawnExtension).not.toHaveBeenCalled()
    expect(getExtensionById('com.nuxy.unknownperm')).toBeUndefined()
  })

  it('rejects an extension whose backend source imports a forbidden Node builtin', async () => {
    const dir = path.join(EXTENSION_DIR, 'com.nuxy.nodeimport')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(
      path.join(dir, 'manifest.json'),
      JSON.stringify({
        id: 'com.nuxy.nodeimport',
        name: 'Node Import',
        version: '1.0.0',
        entry: { backend: 'backend.js' },
      })
    )
    fs.writeFileSync(path.join(dir, 'backend.js'), `import fs from 'fs'\nexport default () => {}`)

    await scanExtensions()

    expect(spawnExtension).not.toHaveBeenCalled()
    expect(getExtensionById('com.nuxy.nodeimport')).toBeUndefined()
  })
})

describe('security verification flow (via scanExtensions)', () => {
  const EXTRACTED_DIR = path.join(mockHome, 'extracted')
  const EXTENSION_DIR = path.join(mockHome, 'extensions')

  beforeEach(() => {
    fs.mkdirSync(mockHome, { recursive: true })
    fs.mkdirSync(EXTRACTED_DIR, { recursive: true })
    fs.mkdirSync(EXTENSION_DIR, { recursive: true })
    vi.clearAllMocks()
  })

  afterEach(() => {
    fs.rmSync(mockHome, { recursive: true, force: true })
  })

  function writeExtension(folderName: string, manifest: Record<string, unknown>) {
    const dir = path.join(EXTENSION_DIR, folderName)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest))
    fs.writeFileSync(path.join(dir, 'backend.js'), 'export default async function bootstrap() {}')
  }

  it('skips the extension and cleans the temp folder when integrity verification fails', async () => {
    vi.mocked(verifyDirectoryIntegrity).mockReturnValue({
      success: false,
      error: 'tampered',
    } as any)

    writeExtension('com.nuxy.tampered', {
      id: 'com.nuxy.tampered',
      name: 'Tampered',
      version: '1.0.0',
      entry: { backend: 'backend.js' },
    })

    await scanExtensions()

    expect(spawnExtension).not.toHaveBeenCalled()
    expect(fs.existsSync(path.join(EXTRACTED_DIR, 'com.nuxy.tampered'))).toBe(false)
  })

  it('skips the extension when its publisher key/hash is revoked', async () => {
    vi.mocked(verifyDirectoryIntegrity).mockReturnValue({
      success: true,
      publicKey: 'revoked-key',
      hash: 'revoked-hash',
    })
    vi.mocked(isRevoked).mockReturnValue(true)

    writeExtension('com.nuxy.revoked', {
      id: 'com.nuxy.revoked',
      name: 'Revoked',
      version: '1.0.0',
      entry: { backend: 'backend.js' },
    })

    await scanExtensions()

    expect(spawnExtension).not.toHaveBeenCalled()
  })

  it('moves the extension to EXTRACTED_DIR and marks it read-only when trusted', async () => {
    vi.mocked(isKeyTrusted).mockReturnValue(true)
    vi.mocked(isRevoked).mockReturnValue(false)
    vi.mocked(verifyDirectoryIntegrity).mockReturnValue({
      success: true,
      publicKey: 'trusted-key',
      hash: 'trusted-hash',
    })

    writeExtension('com.nuxy.trusted', {
      id: 'com.nuxy.trusted',
      name: 'Trusted',
      version: '1.0.0',
      entry: { backend: 'backend.js' },
    })

    await scanExtensions()

    expect(makeDirectoryReadOnly).toHaveBeenCalledWith(path.join(EXTRACTED_DIR, 'com.nuxy.trusted'))
    expect(spawnExtension).toHaveBeenCalledWith(
      'com.nuxy.trusted',
      'com.nuxy.trusted',
      'backend.js',
      []
    )
  })

  it('aborts the current scan and schedules a rescan when an untrusted publisher key is auto-trusted (NODE_ENV=test)', async () => {
    vi.mocked(isKeyTrusted).mockReturnValue(false)
    vi.mocked(isRevoked).mockReturnValue(false)
    vi.mocked(verifyDirectoryIntegrity).mockReturnValue({
      success: true,
      publicKey: 'untrusted-key',
      hash: 'untrusted-hash',
    })
    vi.mocked(getMainWindow).mockReturnValue(null)
    process.env.NODE_ENV = 'test'

    writeExtension('com.nuxy.untrusted', {
      id: 'com.nuxy.untrusted',
      name: 'Untrusted',
      version: '1.0.0',
      entry: { backend: 'backend.js' },
    })

    await scanExtensions()

    // promptTrustPublisherKey auto-approves in NODE_ENV=test, which schedules
    // a rescan (setTimeout) and aborts *this* scan run before it reaches the
    // registration phase — so nothing should be spawned synchronously yet.
    expect(spawnExtension).not.toHaveBeenCalled()
    expect(fs.existsSync(path.join(EXTRACTED_DIR, 'com.nuxy.untrusted'))).toBe(false)
  })
})

describe('dedupeExtractedByManifestId (via scanExtensions)', () => {
  const EXTRACTED_DIR = path.join(mockHome, 'extracted')
  const EXTENSION_DIR = path.join(mockHome, 'extensions')

  beforeEach(() => {
    fs.mkdirSync(mockHome, { recursive: true })
    fs.mkdirSync(EXTRACTED_DIR, { recursive: true })
    fs.mkdirSync(EXTENSION_DIR, { recursive: true })
    vi.clearAllMocks()
    vi.mocked(isKeyTrusted).mockReturnValue(true)
    vi.mocked(isRevoked).mockReturnValue(false)
    vi.mocked(verifyDirectoryIntegrity).mockReturnValue({
      success: true,
      publicKey: 'mock-public-key',
      hash: 'mock-hash',
    })
  })

  afterEach(() => {
    fs.rmSync(mockHome, { recursive: true, force: true })
  })

  it('keeps only the higher-scored folder when two extracted folders share the same manifest id', async () => {
    // legacy (no version suffix) vs versioned folder, both with the same manifest id
    const extA = path.join(EXTENSION_DIR, 'com.nuxy.dup')
    fs.mkdirSync(extA, { recursive: true })
    fs.writeFileSync(
      path.join(extA, 'manifest.json'),
      JSON.stringify({
        id: 'com.nuxy.dup',
        name: 'Dup',
        version: '1.0.0',
        entry: { backend: 'backend.js' },
      })
    )
    fs.writeFileSync(path.join(extA, 'backend.js'), 'export default async function bootstrap() {}')

    const extB = path.join(EXTENSION_DIR, 'com.nuxy.dup-1.0.0')
    fs.mkdirSync(extB, { recursive: true })
    fs.writeFileSync(
      path.join(extB, 'manifest.json'),
      JSON.stringify({
        id: 'com.nuxy.dup',
        name: 'Dup',
        version: '1.0.0',
        entry: { backend: 'backend.js' },
      })
    )
    fs.writeFileSync(path.join(extB, 'backend.js'), 'export default async function bootstrap() {}')

    await scanExtensions()

    // Only one of the two extracted folders should survive deduplication.
    const remaining = fs
      .readdirSync(EXTRACTED_DIR)
      .filter((f) => f.startsWith('com.nuxy.dup') && !f.startsWith('.'))
    expect(remaining).toHaveLength(1)
    expect(spawnExtension).toHaveBeenCalledTimes(1)
  })
})
