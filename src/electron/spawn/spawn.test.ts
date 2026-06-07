import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventEmitter } from 'events'

// ─── Fake Worker ───────────────────────────────────────────────────────────────

class FakeWorker extends EventEmitter {
  postMessage = vi.fn()
  setMaxListeners = vi.fn()
  terminate = vi.fn()
  constructor(
    public script: string,
    public options: any
  ) {
    super()
  }
}

let lastWorker: FakeWorker

vi.mock('worker_threads', () => ({
  Worker: vi.fn((script: string, opts: any) => {
    lastWorker = new FakeWorker(script, opts)
    return lastWorker
  }),
}))

// ─── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../config/paths.js', () => ({
  EXTRACTED_DIR: '/fake/extracted',
}))

vi.mock('@nuxy/core', () => ({
  kernelLogger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      silly: vi.fn(),
    })),
  },
}))

vi.mock('./active-workers.js', () => ({
  activeWorkers: new Map(),
  workerExitListeners: new Set(),
  workerRegistryErrorListeners: new Set(),
}))

vi.mock('./migrate-data.js', () => ({
  migrateLegacyData: vi.fn(),
}))

vi.mock('../extensions/registry.js', () => ({
  mergeRuntimeSync: vi.fn(),
}))

vi.mock('./host-handlers.js', () => ({
  handleHostCall: vi.fn(async () => ({ result: 'ok' })),
}))

vi.mock('../extensions/bundle-backend.js', () => ({
  bundleExtensionBackend: vi.fn((entryPath: string) => entryPath),
}))

// ─── Imports (after mocks) ─────────────────────────────────────────────────────

import { spawnExtension } from './spawn.js'
import {
  activeWorkers,
  workerExitListeners,
  workerRegistryErrorListeners,
} from './active-workers.js'
import { migrateLegacyData } from './migrate-data.js'
import { mergeRuntimeSync } from '../extensions/registry.js'
import { handleHostCall } from './host-handlers.js'
import { bundleExtensionBackend } from '../extensions/bundle-backend.js'

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Flush the microtask queue so async message handlers complete. */
const flush = () => new Promise<void>((resolve) => setImmediate(resolve))

describe('spawnExtension', () => {
  const extId = 'com.nuxy.test'
  const folderName = 'test-extension'
  const entryFile = 'backend.js'
  const permissions = ['clipboard']

  beforeEach(() => {
    vi.clearAllMocks()
    ;(activeWorkers as Map<string, any>).clear()
  })

  // ─── 1. migrateLegacyData ─────────────────────────────────────────────────

  it('calls migrateLegacyData with extId and folderName', async () => {
    await spawnExtension(extId, folderName, entryFile)
    expect(migrateLegacyData).toHaveBeenCalledOnce()
    expect(migrateLegacyData).toHaveBeenCalledWith(extId, folderName)
  })

  it('pre-bundles the backend entry before spawning the worker', async () => {
    await spawnExtension(extId, folderName, entryFile)

    expect(bundleExtensionBackend).toHaveBeenCalledOnce()
    expect(bundleExtensionBackend).toHaveBeenCalledWith(
      '/fake/extracted/test-extension/backend.js',
      '/fake/extracted/test-extension'
    )
  })

  // ─── 2. Worker construction ───────────────────────────────────────────────

  it('creates a Worker with a script path ending in extension-host.js and correct workerData', async () => {
    await spawnExtension(extId, folderName, entryFile, permissions)

    expect(lastWorker.script).toMatch(/extension-host\.js$/)

    const { workerData } = lastWorker.options
    expect(workerData).toMatchObject({
      extId,
      permissions,
    })
    // absolutePath must be a file URL pointing at the entry inside the folder
    expect(workerData.absolutePath).toMatch(/^file:\/\//)
    expect(workerData.absolutePath).toContain(folderName)
    expect(workerData.absolutePath).toContain(entryFile)
    // logLevel key must exist
    expect(workerData).toHaveProperty('logLevel')
  })

  // ─── 3. Registers worker in activeWorkers ─────────────────────────────────

  it('registers the worker in activeWorkers under extId', async () => {
    await spawnExtension(extId, folderName, entryFile)
    expect(activeWorkers.has(extId)).toBe(true)
    expect(activeWorkers.get(extId)).toBe(lastWorker)
  })

  // ─── 4. Returns the worker ────────────────────────────────────────────────

  it('returns the worker instance', async () => {
    const returned = await spawnExtension(extId, folderName, entryFile)
    expect(returned).toBe(lastWorker)
  })

  // ─── 5. absolutePath is derived from EXTRACTED_DIR ────────────────────────

  it('builds absolutePath from EXTRACTED_DIR, folderName and entryFile', async () => {
    await spawnExtension(extId, folderName, entryFile)
    const { absolutePath } = lastWorker.options.workerData
    // pathToFileURL('/fake/extracted/test-extension/backend.js').href
    expect(absolutePath).toBe('file:///fake/extracted/test-extension/backend.js')
  })

  // ─── 6. registry:sync message ─────────────────────────────────────────────

  it('calls mergeRuntimeSync when a registry:sync message is received', async () => {
    await spawnExtension(extId, folderName, entryFile)

    lastWorker.emit('message', {
      type: 'registry:sync',
      ipcChannels: ['foo', 'bar'],
      displayName: 'Test Extension',
    })
    await flush()

    expect(mergeRuntimeSync).toHaveBeenCalledOnce()
    expect(mergeRuntimeSync).toHaveBeenCalledWith(extId, {
      ipcChannels: ['foo', 'bar'],
      displayName: 'Test Extension',
    })
  })

  it('defaults ipcChannels to [] when missing in registry:sync', async () => {
    await spawnExtension(extId, folderName, entryFile)

    lastWorker.emit('message', { type: 'registry:sync', displayName: 'X' })
    await flush()

    expect(mergeRuntimeSync).toHaveBeenCalledWith(extId, {
      ipcChannels: [],
      displayName: 'X',
    })
  })

  // ─── 7. registry:error message ────────────────────────────────────────────

  it('does not crash on registry:error message', async () => {
    await spawnExtension(extId, folderName, entryFile)
    expect(() =>
      lastWorker.emit('message', { type: 'registry:error', error: 'boom' })
    ).not.toThrow()
    await flush()
    // mergeRuntimeSync should not be called for error messages
    expect(mergeRuntimeSync).not.toHaveBeenCalled()
  })

  it('removes worker and notifies registry error listeners on registry:error', async () => {
    const listener = vi.fn()
    workerRegistryErrorListeners.add(listener)

    await spawnExtension(extId, folderName, entryFile)
    expect(activeWorkers.has(extId)).toBe(true)

    lastWorker.emit('message', { type: 'registry:error', error: 'boom' })
    await flush()

    expect(activeWorkers.has(extId)).toBe(false)
    expect(listener).toHaveBeenCalledWith(extId)
    workerRegistryErrorListeners.delete(listener)
  })

  // ─── 8. host:call message ─────────────────────────────────────────────────

  it('calls handleHostCall and posts host:reply on host:call message', async () => {
    await spawnExtension(extId, folderName, entryFile)

    lastWorker.emit('message', {
      type: 'host:call',
      id: 'call-42',
      channel: 'clipboard:read',
      payload: null,
    })
    await flush()

    expect(handleHostCall).toHaveBeenCalledOnce()
    expect(handleHostCall).toHaveBeenCalledWith(extId, 'clipboard:read', null)

    expect(lastWorker.postMessage).toHaveBeenCalledOnce()
    expect(lastWorker.postMessage).toHaveBeenCalledWith({
      type: 'host:reply',
      id: 'call-42',
      result: 'ok',
    })
  })

  // ─── 9. null message → no crash ───────────────────────────────────────────

  it('does nothing and does not crash on a null message', async () => {
    await spawnExtension(extId, folderName, entryFile)

    expect(() => lastWorker.emit('message', null)).not.toThrow()
    await flush()

    expect(mergeRuntimeSync).not.toHaveBeenCalled()
    expect(handleHostCall).not.toHaveBeenCalled()
    expect(lastWorker.postMessage).not.toHaveBeenCalled()
  })

  // ─── 10. exit code 0 → removes worker ────────────────────────────────────

  it('removes worker from activeWorkers on exit with code 0', async () => {
    await spawnExtension(extId, folderName, entryFile)
    expect(activeWorkers.has(extId)).toBe(true)

    lastWorker.emit('exit', 0)

    expect(activeWorkers.has(extId)).toBe(false)
  })

  // ─── 11. exit non-zero → still removes worker ─────────────────────────────

  it('removes worker from activeWorkers on exit with non-zero code', async () => {
    await spawnExtension(extId, folderName, entryFile)
    expect(activeWorkers.has(extId)).toBe(true)

    lastWorker.emit('exit', 1)

    expect(activeWorkers.has(extId)).toBe(false)
  })

  // ─── 12. exit listeners ───────────────────────────────────────────────────

  it('notifies workerExitListeners on exit', async () => {
    const listener = vi.fn()
    workerExitListeners.add(listener)

    await spawnExtension(extId, folderName, entryFile)
    lastWorker.emit('exit', 1)

    expect(listener).toHaveBeenCalledWith(extId, 1)
    workerExitListeners.delete(listener)
  })
})
