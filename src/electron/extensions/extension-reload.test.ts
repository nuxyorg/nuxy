import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import {
  clearExtensionWatchers,
  folderNameFromWatchFilename,
  isReloadTriggerFile,
  onExtensionWorkerExit,
  reloadExtensionFolder,
  restartExtensionWorker,
  scheduleWorkerRestart,
  shouldTriggerDevExtensionRescan,
  startExtensionDirectoryWatcher,
  terminateExtensionWorker,
} from './extension-reload.js'
import { activeWorkers } from '../spawn/spawn.js'
import { spawnExtension } from '../spawn/spawn.js'
import { getExtensionById, registerExtension } from './registry.js'

const mockHome = path.join(os.tmpdir(), 'nuxy-reload-test-home')

vi.mock('../config/paths.js', () => {
  const os = require('os')
  const path = require('path')
  const mockHome = path.join(os.tmpdir(), 'nuxy-reload-test-home')
  return {
    DATA_DIR: path.join(mockHome, 'data'),
    EXTRACTED_DIR: path.join(mockHome, 'extracted'),
    EXTENSION_DIR: path.join(mockHome, 'extensions'),
  }
})

vi.mock('../spawn/spawn.js', () => ({
  activeWorkers: new Map(),
  spawnExtension: vi.fn(),
}))

vi.mock('../security/security.js', () => ({
  verifyDirectoryIntegrity: vi.fn().mockReturnValue({
    success: true,
    publicKey: 'mock-public-key',
    hash: 'mock-hash',
  }),
  isKeyTrusted: vi.fn().mockReturnValue(true),
  isRevoked: vi.fn().mockReturnValue(false),
  makeDirectoryReadOnly: vi.fn(),
}))

describe('isReloadTriggerFile', () => {
  it('returns true for manifest.json', () => {
    expect(isReloadTriggerFile('manifest.json')).toBe(true)
  })

  it('returns true for the declared backend entry', () => {
    expect(isReloadTriggerFile('backend.js', 'backend.js')).toBe(true)
  })

  it('returns true for packaged .nuxyext files', () => {
    expect(isReloadTriggerFile('com.nuxy.shell.nuxyext')).toBe(true)
  })

  it('returns true when the platform omits the filename', () => {
    expect(isReloadTriggerFile(null)).toBe(true)
  })

  it('returns false for unrelated files', () => {
    expect(isReloadTriggerFile('frontend.js', 'backend.js')).toBe(false)
    expect(isReloadTriggerFile('styles.css', 'backend.js')).toBe(false)
  })
})

describe('folderNameFromWatchFilename', () => {
  it('returns top-level folder name from nested path', () => {
    expect(folderNameFromWatchFilename('com.nuxy.shell/manifest.json')).toBe('com.nuxy.shell')
  })

  it('strips .nuxyext suffix from zip file events', () => {
    expect(folderNameFromWatchFilename('com.nuxy.shell.nuxyext')).toBe('com.nuxy.shell')
  })

  it('returns null for hidden paths', () => {
    expect(folderNameFromWatchFilename('.hidden')).toBeNull()
  })

  it('returns null for empty filename', () => {
    expect(folderNameFromWatchFilename('')).toBeNull()
  })
})

describe('shouldTriggerDevExtensionRescan', () => {
  it('returns false for null filename (Linux inotify quirk)', () => {
    expect(shouldTriggerDevExtensionRescan(null, '/ext')).toBe(false)
  })

  it('returns false for loose shared files at extensions root', () => {
    expect(shouldTriggerDevExtensionRescan('e2e-helpers.ts', '/ext')).toBe(false)
  })

  it('returns false for uikit .nuxyext updates', () => {
    const readType = (folderName: string) => (folderName === 'com.nuxy.ui-default' ? 'uikit' : null)
    expect(shouldTriggerDevExtensionRescan('com.nuxy.ui-default.nuxyext', '/ext', readType)).toBe(
      false
    )
  })

  it('returns false when a .nuxyext is mid-write and type cannot be read', () => {
    expect(shouldTriggerDevExtensionRescan('com.nuxy.ui-default.nuxyext', '/ext', () => null)).toBe(
      false
    )
  })

  it('returns true for non-uikit .nuxyext updates', () => {
    const readType = (folderName: string) =>
      folderName === 'com.nuxy.shell' ? 'orchestrator' : null
    expect(shouldTriggerDevExtensionRescan('com.nuxy.shell.nuxyext', '/ext', readType)).toBe(true)
  })

  it('returns true for nested manifest changes', () => {
    const readType = () => 'tool'
    expect(shouldTriggerDevExtensionRescan('com.nuxy.notes/manifest.json', '/ext', readType)).toBe(
      true
    )
  })
})

describe('reloadExtensionFolder', () => {
  const EXTRACTED_DIR = path.join(mockHome, 'extracted')
  const EXTENSION_DIR = path.join(mockHome, 'extensions')
  const folderName = 'com.nuxy.reloadtest'

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

  it('re-syncs from EXTENSION_DIR and spawns a new worker', async () => {
    const extDir = path.join(EXTENSION_DIR, folderName)
    fs.mkdirSync(extDir, { recursive: true })
    fs.writeFileSync(
      path.join(extDir, 'manifest.json'),
      JSON.stringify({
        id: folderName,
        name: 'Reload Test',
        version: '1.0.0',
        entry: { backend: 'backend.js' },
      })
    )
    fs.writeFileSync(
      path.join(extDir, 'backend.js'),
      'export default async function bootstrap() {}'
    )

    registerExtension({
      id: folderName,
      folderName,
      manifest: {
        id: folderName,
        name: 'Reload Test',
        version: '1.0.0',
        type: 'tool',
        entry: { backend: 'backend.js' },
      },
    })

    await reloadExtensionFolder(folderName)

    expect(spawnExtension).toHaveBeenCalledWith(folderName, folderName, 'backend.js', [])
    expect(fs.existsSync(path.join(EXTRACTED_DIR, folderName, 'manifest.json'))).toBe(true)
  })
})

describe('restartExtensionWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(activeWorkers as Map<string, unknown>).clear()
  })

  it('respawns worker for a registered extension with a backend entry', async () => {
    const extId = 'com.nuxy.crash'
    registerExtension({
      id: extId,
      folderName: 'crash-ext',
      manifest: {
        id: extId,
        name: 'Crash',
        version: '1.0.0',
        type: 'tool',
        entry: { backend: 'backend.js' },
        permissions: ['clipboard'],
      },
    })

    await restartExtensionWorker(extId)

    expect(spawnExtension).toHaveBeenCalledWith(extId, 'crash-ext', 'backend.js', ['clipboard'])
    expect(getExtensionById(extId)).toBeDefined()
  })

  it('does not respawn disabled extensions', async () => {
    registerExtension({
      id: 'com.nuxy.off',
      folderName: 'off-ext',
      manifest: {
        id: 'com.nuxy.off',
        name: 'Off',
        version: '1.0.0',
        type: 'tool',
        entry: { backend: 'backend.js' },
      },
      disabled: true,
    })

    await restartExtensionWorker('com.nuxy.off')
    expect(spawnExtension).not.toHaveBeenCalled()
  })
})

describe('onExtensionWorkerExit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('schedules restart on non-zero worker exit', async () => {
    registerExtension({
      id: 'com.nuxy.exit',
      folderName: 'exit-ext',
      manifest: {
        id: 'com.nuxy.exit',
        name: 'Exit',
        version: '1.0.0',
        type: 'tool',
        entry: { backend: 'backend.js' },
      },
    })

    onExtensionWorkerExit('com.nuxy.exit', 1)
    vi.advanceTimersByTime(500)
    await Promise.resolve()
    expect(spawnExtension).toHaveBeenCalled()
  })

  it('ignores clean exit (code 0)', () => {
    registerExtension({
      id: 'com.nuxy.clean',
      folderName: 'clean-ext',
      manifest: {
        id: 'com.nuxy.clean',
        name: 'Clean',
        version: '1.0.0',
        type: 'tool',
        entry: { backend: 'backend.js' },
      },
    })

    onExtensionWorkerExit('com.nuxy.clean', 0)
    vi.advanceTimersByTime(500)
    expect(spawnExtension).not.toHaveBeenCalled()
  })

  it('does not schedule restart during intentional terminate', async () => {
    registerExtension({
      id: 'com.nuxy.intentional',
      folderName: 'intentional-ext',
      manifest: {
        id: 'com.nuxy.intentional',
        name: 'Intentional',
        version: '1.0.0',
        type: 'tool',
        entry: { backend: 'backend.js' },
      },
    })

    const mockWorker = { terminate: vi.fn().mockResolvedValue(undefined) }
    ;(activeWorkers as Map<string, unknown>).set('com.nuxy.intentional', mockWorker)

    const terminating = terminateExtensionWorker('com.nuxy.intentional')
    onExtensionWorkerExit('com.nuxy.intentional', 1)
    await terminating

    vi.advanceTimersByTime(500)
    await Promise.resolve()
    expect(spawnExtension).not.toHaveBeenCalled()
  })
})

describe('startExtensionDirectoryWatcher (production)', () => {
  const EXTENSION_DIR = path.join(mockHome, 'extensions')
  const EXTRACTED_DIR = path.join(mockHome, 'extracted')
  const folderName = 'com.nuxy.watchtest'
  let watchCallbacks: Array<{ dir: string; cb: (event: string, filename?: string) => void }> = []
  let watchSpy: any

  beforeEach(() => {
    fs.mkdirSync(mockHome, { recursive: true })
    fs.mkdirSync(EXTENSION_DIR, { recursive: true })
    fs.mkdirSync(EXTRACTED_DIR, { recursive: true })
    watchCallbacks = []
    watchSpy = vi.spyOn(fs, 'watch').mockImplementation(((dir: any, _opts: any, cb: any) => {
      watchCallbacks.push({
        dir: dir as string,
        cb: cb as (event: string, filename?: string) => void,
      })
      return { close: vi.fn() } as unknown as fs.FSWatcher
    }) as any)
    vi.clearAllMocks()
    clearExtensionWatchers()
  })

  afterEach(() => {
    clearExtensionWatchers()
    watchSpy.mockRestore()
    vi.useRealTimers()
    fs.rmSync(mockHome, { recursive: true, force: true })
  })

  it('watches EXTENSION_DIR and each extension folder in production mode', () => {
    const extDir = path.join(EXTENSION_DIR, folderName)
    fs.mkdirSync(extDir, { recursive: true })
    fs.writeFileSync(
      path.join(extDir, 'manifest.json'),
      JSON.stringify({
        id: folderName,
        name: 'Watch Test',
        version: '1.0.0',
        entry: { backend: 'backend.js' },
      })
    )

    startExtensionDirectoryWatcher(false)

    expect(watchCallbacks.some((w) => w.dir === EXTENSION_DIR)).toBe(true)
    expect(watchCallbacks.some((w) => w.dir === extDir)).toBe(true)
  })

  it('schedules folder reload when manifest.json changes in a watched folder', async () => {
    const extDir = path.join(EXTENSION_DIR, folderName)
    fs.mkdirSync(extDir, { recursive: true })
    fs.writeFileSync(
      path.join(extDir, 'manifest.json'),
      JSON.stringify({
        id: folderName,
        name: 'Watch Test',
        version: '1.0.0',
        entry: { backend: 'backend.js' },
      })
    )
    fs.writeFileSync(
      path.join(extDir, 'backend.js'),
      'export default async function bootstrap() {}'
    )

    registerExtension({
      id: folderName,
      folderName,
      manifest: {
        id: folderName,
        name: 'Watch Test',
        version: '1.0.0',
        type: 'tool',
        entry: { backend: 'backend.js' },
      },
    })

    startExtensionDirectoryWatcher(false)
    const folderWatch = watchCallbacks.find((w) => w.dir === extDir)
    expect(folderWatch).toBeDefined()
    folderWatch!.cb('change', 'manifest.json')

    await new Promise((resolve) => setTimeout(resolve, 600))
    expect(spawnExtension).toHaveBeenCalledWith(folderName, folderName, 'backend.js', [])
  })

  it('ignores unrelated file changes in a watched folder', async () => {
    vi.useFakeTimers()
    const extDir = path.join(EXTENSION_DIR, folderName)
    fs.mkdirSync(extDir, { recursive: true })
    fs.writeFileSync(
      path.join(extDir, 'manifest.json'),
      JSON.stringify({
        id: folderName,
        name: 'Watch Test',
        version: '1.0.0',
        entry: { backend: 'backend.js' },
      })
    )

    startExtensionDirectoryWatcher(false)
    const folderWatch = watchCallbacks.find((w) => w.dir === extDir)
    folderWatch!.cb('change', 'frontend.js')

    vi.advanceTimersByTime(500)
    await Promise.resolve()
    expect(spawnExtension).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})

describe('scheduleWorkerRestart', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces restart and calls spawnExtension', async () => {
    registerExtension({
      id: 'com.nuxy.debounce',
      folderName: 'debounce-ext',
      manifest: {
        id: 'com.nuxy.debounce',
        name: 'Debounce',
        version: '1.0.0',
        type: 'tool',
        entry: { backend: 'backend.js' },
      },
    })

    scheduleWorkerRestart('com.nuxy.debounce', 200)
    vi.advanceTimersByTime(199)
    expect(spawnExtension).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    await Promise.resolve()
    expect(spawnExtension).toHaveBeenCalled()
  })
})
