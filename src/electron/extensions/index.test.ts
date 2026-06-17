import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

const mockHome = path.join(os.tmpdir(), 'nuxy-extensions-index-test-home')

vi.mock('../config/paths.js', () => {
  const os = require('os')
  const path = require('path')
  const mockHome = path.join(os.tmpdir(), 'nuxy-extensions-index-test-home')
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
}))

const { reload, terminateExtensionWorker, clearExtensionWatchers } = vi.hoisted(() => ({
  reload: vi.fn(),
  terminateExtensionWorker: vi.fn().mockResolvedValue(undefined),
  clearExtensionWatchers: vi.fn(),
}))

vi.mock('../window/manager.js', () => ({
  getMainWindow: vi.fn().mockReturnValue({ webContents: { reload } }),
}))

vi.mock('./seed-bundled.js', () => ({
  seedBundledExtensions: vi.fn(),
}))

vi.mock('./extension-reload.js', async () => {
  const actual =
    await vi.importActual<typeof import('./extension-reload.js')>('./extension-reload.js')
  return {
    ...actual,
    terminateExtensionWorker,
    clearExtensionWatchers,
  }
})

import { scanExtensions, rescanExtensions, loadedExtensions } from './index.js'
import { activeWorkers } from '../spawn/spawn.js'

describe('extensions/index.ts orchestration', () => {
  const EXTRACTED_DIR = path.join(mockHome, 'extracted')
  const EXTENSION_DIR = path.join(mockHome, 'extensions')

  beforeEach(() => {
    fs.mkdirSync(mockHome, { recursive: true })
    fs.mkdirSync(EXTRACTED_DIR, { recursive: true })
    fs.mkdirSync(EXTENSION_DIR, { recursive: true })
    vi.clearAllMocks()
    ;(activeWorkers as Map<string, unknown>).clear()
  })

  afterEach(() => {
    fs.rmSync(mockHome, { recursive: true, force: true })
  })

  it('re-exports loadedExtensions from the registry', () => {
    expect(Array.isArray(loadedExtensions)).toBe(true)
  })

  it('scanExtensions populates the registry from EXTENSION_DIR', async () => {
    const extDir = path.join(EXTENSION_DIR, 'com.nuxy.idx')
    fs.mkdirSync(extDir, { recursive: true })
    fs.writeFileSync(
      path.join(extDir, 'manifest.json'),
      JSON.stringify({
        id: 'com.nuxy.idx',
        name: 'Index Test',
        version: '1.0.0',
        entry: { backend: 'backend.js' },
      })
    )

    await scanExtensions()

    expect(loadedExtensions.some((e) => e.id === 'com.nuxy.idx')).toBe(true)
  })

  it('rescanExtensions terminates active workers, clears watchers, rescans, and reloads the window', async () => {
    ;(activeWorkers as Map<string, unknown>).set('com.nuxy.worker', {})

    await rescanExtensions()

    expect(clearExtensionWatchers).toHaveBeenCalledTimes(1)
    expect(terminateExtensionWorker).toHaveBeenCalledWith('com.nuxy.worker')
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
