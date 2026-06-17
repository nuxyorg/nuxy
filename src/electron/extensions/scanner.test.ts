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

describe('scanExtensions directory scanning', () => {
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
