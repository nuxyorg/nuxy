import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

const mockHome = path.join(os.tmpdir(), 'nuxy-manifest-loader-test-home')

vi.mock('../config/paths.js', () => {
  const os = require('os')
  const path = require('path')
  const mockHome = path.join(os.tmpdir(), 'nuxy-manifest-loader-test-home')
  return {
    CONFIG_DIR: mockHome,
    DATA_DIR: path.join(mockHome, 'data'),
    EXTRACTED_DIR: path.join(mockHome, 'extracted'),
    EXTENSION_DIR: path.join(mockHome, 'extensions'),
  }
})

vi.mock('../spawn/spawn.js', () => ({
  spawnExtension: vi.fn(),
  activeWorkers: new Map(),
}))

vi.mock('../security/security.js', () => ({
  isKeyTrusted: vi.fn().mockReturnValue(true),
  addTrustedKey: vi.fn(),
  isRevoked: vi.fn().mockReturnValue(false),
  verifyDirectoryIntegrity: vi.fn().mockReturnValue({
    success: true,
    publicKey: 'mock-public-key',
    hash: 'mock-hash',
  }),
  makeDirectoryReadOnly: vi.fn(),
}))

vi.mock('../window/manager.js', () => ({
  getMainWindow: vi.fn().mockReturnValue(null),
}))

import {
  scanDirectoryForNodeImports,
  restoreWritable,
  dedupeExtractedByManifestId,
  promptTrustPublisherKey,
  verifyAndSecureExtension,
} from './manifest-loader.js'
import {
  isKeyTrusted,
  isRevoked,
  verifyDirectoryIntegrity,
  makeDirectoryReadOnly,
} from '../security/security.js'

const EXTRACTED_DIR = path.join(mockHome, 'extracted')

describe('scanDirectoryForNodeImports', () => {
  beforeEach(() => {
    fs.mkdirSync(mockHome, { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(mockHome, { recursive: true, force: true })
  })

  it('reports files that import forbidden Node builtins', () => {
    const dir = path.join(mockHome, 'src1')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'backend.js'), `import fs from 'fs'\nexport default () => {}`)

    const violations = scanDirectoryForNodeImports(dir)

    expect(violations).toHaveLength(1)
    expect(violations[0].imports).toEqual(['fs'])
  })

  it('ignores node_modules, .git, scripts, dist, and build directories', () => {
    const dir = path.join(mockHome, 'src2')
    for (const sub of ['node_modules', '.git', 'scripts', 'dist', 'build']) {
      const subDir = path.join(dir, sub)
      fs.mkdirSync(subDir, { recursive: true })
      fs.writeFileSync(path.join(subDir, 'x.js'), `require('child_process')`)
    }

    const violations = scanDirectoryForNodeImports(dir)

    expect(violations).toHaveLength(0)
  })

  it('ignores test/spec files and dotfiles', () => {
    const dir = path.join(mockHome, 'src3')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'backend.test.js'), `require('fs')`)
    fs.writeFileSync(path.join(dir, 'backend.spec.ts'), `require('fs')`)
    fs.writeFileSync(path.join(dir, '.hidden.js'), `require('fs')`)

    const violations = scanDirectoryForNodeImports(dir)

    expect(violations).toHaveLength(0)
  })

  it('returns no violations for a non-existent directory', () => {
    expect(scanDirectoryForNodeImports(path.join(mockHome, 'nope'))).toEqual([])
  })
})

describe('restoreWritable', () => {
  beforeEach(() => {
    fs.mkdirSync(mockHome, { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(mockHome, { recursive: true, force: true })
  })

  it('restores write permissions recursively', () => {
    const dir = path.join(mockHome, 'readonly-dir')
    const nested = path.join(dir, 'nested')
    fs.mkdirSync(nested, { recursive: true })
    fs.writeFileSync(path.join(nested, 'file.txt'), 'hi')
    fs.chmodSync(nested, 0o555)
    fs.chmodSync(dir, 0o555)

    expect(() => restoreWritable(dir)).not.toThrow()
    const mode = fs.statSync(dir).mode & 0o777
    expect(mode).toBe(0o755)
  })

  it('does not throw for a non-existent path', () => {
    expect(() => restoreWritable(path.join(mockHome, 'missing'))).not.toThrow()
  })
})

describe('dedupeExtractedByManifestId', () => {
  beforeEach(() => {
    fs.mkdirSync(EXTRACTED_DIR, { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(mockHome, { recursive: true, force: true })
  })

  it('removes the lower-scored duplicate folder and keeps the higher-scored one', () => {
    const legacy = path.join(EXTRACTED_DIR, 'com.nuxy.dup')
    const versioned = path.join(EXTRACTED_DIR, 'com.nuxy.dup-1.0.0')
    fs.mkdirSync(legacy, { recursive: true })
    fs.mkdirSync(versioned, { recursive: true })
    fs.writeFileSync(path.join(legacy, 'manifest.json'), JSON.stringify({ id: 'com.nuxy.dup' }))
    fs.writeFileSync(path.join(versioned, 'manifest.json'), JSON.stringify({ id: 'com.nuxy.dup' }))
    // Give the versioned one a frontend bundle so it scores higher.
    fs.writeFileSync(path.join(versioned, '_frontend.bundle.mjs'), '')

    const activeFolders = new Set(['com.nuxy.dup', 'com.nuxy.dup-1.0.0'])
    dedupeExtractedByManifestId(activeFolders)

    expect(activeFolders.has('com.nuxy.dup-1.0.0')).toBe(true)
    expect(activeFolders.has('com.nuxy.dup')).toBe(false)
    expect(fs.existsSync(versioned)).toBe(true)
    expect(fs.existsSync(legacy)).toBe(false)
  })

  it('leaves non-duplicate folders untouched', () => {
    const a = path.join(EXTRACTED_DIR, 'com.nuxy.a')
    fs.mkdirSync(a, { recursive: true })
    fs.writeFileSync(path.join(a, 'manifest.json'), JSON.stringify({ id: 'com.nuxy.a' }))

    const activeFolders = new Set(['com.nuxy.a'])
    dedupeExtractedByManifestId(activeFolders)

    expect(activeFolders.has('com.nuxy.a')).toBe(true)
    expect(fs.existsSync(a)).toBe(true)
  })

  it('skips folders with unreadable/missing manifests without throwing', () => {
    const noManifest = path.join(EXTRACTED_DIR, 'com.nuxy.nomanifest')
    fs.mkdirSync(noManifest, { recursive: true })

    const activeFolders = new Set(['com.nuxy.nomanifest'])
    expect(() => dedupeExtractedByManifestId(activeFolders)).not.toThrow()
    expect(activeFolders.has('com.nuxy.nomanifest')).toBe(true)
  })
})

describe('promptTrustPublisherKey', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  it('auto-approves in NODE_ENV=test', () => {
    process.env.NODE_ENV = 'test'
    expect(promptTrustPublisherKey('com.nuxy.x', 'pem-key')).toBe(true)
  })

  it('auto-blocks (returns false) when showing the dialog throws, e.g. no main window', () => {
    process.env.NODE_ENV = 'production'
    expect(promptTrustPublisherKey('com.nuxy.x', 'pem-key')).toBe(false)
  })
})

describe('verifyAndSecureExtension', () => {
  beforeEach(() => {
    fs.mkdirSync(EXTRACTED_DIR, { recursive: true })
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

  function makeTempExtension(folderName: string) {
    const tempPath = path.join(EXTRACTED_DIR, `.tmp_${folderName}`)
    fs.mkdirSync(tempPath, { recursive: true })
    fs.writeFileSync(path.join(tempPath, 'manifest.json'), JSON.stringify({ id: folderName }))
    return tempPath
  }

  it('returns trusted:false and cleans up tempPath when integrity verification fails', async () => {
    vi.mocked(verifyDirectoryIntegrity).mockReturnValue({
      success: false,
      error: 'tampered',
    } as any)
    const tempPath = makeTempExtension('com.nuxy.bad')
    const targetPath = path.join(EXTRACTED_DIR, 'com.nuxy.bad')

    const result = await verifyAndSecureExtension('com.nuxy.bad', tempPath, targetPath)

    expect(result).toEqual({ trusted: false, reason: 'tampered' })
    expect(fs.existsSync(tempPath)).toBe(false)
  })

  it('returns trusted:false when the publisher key/hash is revoked', async () => {
    vi.mocked(isRevoked).mockReturnValue(true)
    const tempPath = makeTempExtension('com.nuxy.revoked')
    const targetPath = path.join(EXTRACTED_DIR, 'com.nuxy.revoked')

    const result = await verifyAndSecureExtension('com.nuxy.revoked', tempPath, targetPath)

    expect(result).toEqual({ trusted: false, reason: 'Revoked/blacklisted' })
    expect(fs.existsSync(tempPath)).toBe(false)
  })

  it('moves the extension to targetPath and marks it read-only when trusted', async () => {
    const tempPath = makeTempExtension('com.nuxy.good')
    const targetPath = path.join(EXTRACTED_DIR, 'com.nuxy.good')

    const result = await verifyAndSecureExtension('com.nuxy.good', tempPath, targetPath)

    expect(result).toEqual({ trusted: true })
    expect(fs.existsSync(tempPath)).toBe(false)
    expect(fs.existsSync(targetPath)).toBe(true)
    expect(makeDirectoryReadOnly).toHaveBeenCalledWith(targetPath)
  })

  it('replaces an existing targetPath when re-verifying an updated extension', async () => {
    const targetPath = path.join(EXTRACTED_DIR, 'com.nuxy.update')
    fs.mkdirSync(targetPath, { recursive: true })
    fs.writeFileSync(path.join(targetPath, 'old.txt'), 'old')

    const tempPath = makeTempExtension('com.nuxy.update')

    const result = await verifyAndSecureExtension('com.nuxy.update', tempPath, targetPath)

    expect(result).toEqual({ trusted: true })
    expect(fs.existsSync(path.join(targetPath, 'old.txt'))).toBe(false)
    expect(fs.existsSync(path.join(targetPath, 'manifest.json'))).toBe(true)
  })

  it('schedules a rescan and aborts when an untrusted key is approved', async () => {
    vi.useFakeTimers()
    vi.mocked(isKeyTrusted).mockReturnValue(false)
    process.env.NODE_ENV = 'test' // promptTrustPublisherKey auto-approves
    const tempPath = makeTempExtension('com.nuxy.untrusted')
    const targetPath = path.join(EXTRACTED_DIR, 'com.nuxy.untrusted')

    const result = await verifyAndSecureExtension('com.nuxy.untrusted', tempPath, targetPath)

    expect(result).toEqual({ trusted: false, reason: 'rescan-triggered' })
    expect(fs.existsSync(tempPath)).toBe(false)
    expect(fs.existsSync(targetPath)).toBe(false)
    vi.useRealTimers()
  })
})
