import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'

const DatabaseSyncMock = vi.hoisted(() => vi.fn().mockImplementation(() => ({ closed: false })))
vi.mock('node:sqlite', () => ({ DatabaseSync: DatabaseSyncMock }))

import { createCoreProxy } from './core-proxy.ts'
import type { WorkerLogger } from './worker-log.ts'

function makeLogger(): WorkerLogger {
  return {
    silly: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  } as unknown as WorkerLogger
}

describe('createCoreProxy', () => {
  let callHost: ReturnType<typeof vi.fn>
  let logger: WorkerLogger
  let registerIpcHandler: ReturnType<typeof vi.fn>
  let onRegistryEntry: ReturnType<typeof vi.fn>

  beforeEach(() => {
    callHost = vi.fn().mockResolvedValue(undefined)
    logger = makeLogger()
    registerIpcHandler = vi.fn()
    onRegistryEntry = vi.fn()
    DatabaseSyncMock.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function build(permissions: string[] = []) {
    return createCoreProxy(
      callHost,
      logger,
      registerIpcHandler,
      'com.nuxy.test',
      permissions,
      undefined,
      onRegistryEntry
    )
  }

  describe('permission gating', () => {
    it('throws for clipboard APIs without the "clipboard" permission', () => {
      const { core } = build([])
      expect(() => core.clipboard.readText()).toThrow(/Permission Denied/)
      expect(() => core.clipboard.readText()).toThrow(/com.nuxy.test/)
    })

    it('allows clipboard APIs with the "clipboard" permission and delegates to callHost', async () => {
      const { core } = build(['clipboard'])
      await core.clipboard.readText()
      expect(callHost).toHaveBeenCalledWith('clipboard:readText')
    })

    it('throws for db.open without the "db" permission', () => {
      const { core } = build([])
      expect(() => core.db.open('mydb')).toThrow(/Permission Denied/)
    })

    it('opens a DatabaseSync handle with the "db" permission', () => {
      vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined)
      const { core } = build(['db'])
      const handle = core.db.open('mydb')
      expect(DatabaseSyncMock).toHaveBeenCalledTimes(1)
      expect(DatabaseSyncMock.mock.calls[0][0]).toMatch(/mydb\.db$/)
      expect(handle).toBeTruthy()
    })

    it('throws for media APIs without the "media" permission', () => {
      const { core } = build([])
      expect(() => core.media.getNowPlaying()).toThrow(/Permission Denied/)
    })

    it('throws for storage APIs without the "storage" permission', () => {
      const { core } = build([])
      expect(() => core.storage.read('file')).toThrow(/Permission Denied/)
    })

    it('allows storage APIs with the "storage" permission', async () => {
      const { core } = build(['storage'])
      await core.storage.read('file')
      expect(callHost).toHaveBeenCalledWith('storage:read', 'file')
    })
  })

  describe('ipc', () => {
    it('registers a handler and tracks the channel for the sync payload', () => {
      const { core, getSyncPayload } = build()
      const handler = vi.fn()
      core.ipc.handle('com.nuxy.test:doThing', handler)

      expect(registerIpcHandler).toHaveBeenCalledWith('com.nuxy.test:doThing', handler)
      expect(getSyncPayload().ipcChannels).toEqual(['com.nuxy.test:doThing'])
    })

    it('broadcast forwards to callHost without awaiting', () => {
      const { core } = build()
      core.ipc.broadcast('channel', { a: 1 })
      expect(callHost).toHaveBeenCalledWith('ipc:broadcast', { channel: 'channel', data: { a: 1 } })
    })
  })

  describe('registry', () => {
    it('tracks registerTool entries and notifies onRegistryEntry', () => {
      const { core, getSyncPayload } = build()
      core.registry.registerTool({ name: 'mytool', displayName: 'My Tool' } as never)

      expect(onRegistryEntry).toHaveBeenCalledWith({
        kind: 'tool',
        name: 'mytool',
        displayName: 'My Tool',
      })
      expect(getSyncPayload().displayName).toBe('My Tool')
      expect(getSyncPayload().registeredEntries).toEqual([
        { kind: 'tool', name: 'mytool', displayName: 'My Tool' },
      ])
    })

    it('tracks registerProvider entries', () => {
      const { core } = build()
      core.registry.registerProvider({ name: 'myprovider' } as never)
      expect(onRegistryEntry).toHaveBeenCalledWith({ kind: 'provider', name: 'myprovider' })
    })

    it('tracks registerOrchestrator entries', () => {
      const { core } = build()
      core.registry.registerOrchestrator({} as never)
      expect(onRegistryEntry).toHaveBeenCalledWith({ kind: 'orchestrator' })
    })

    it('registerTheme and registerIconPack forward to callHost', () => {
      const { core } = build()
      core.registry.registerTheme({ name: 'ocean' } as never)
      core.registry.registerIconPack({ name: 'lucide' } as never)
      expect(callHost).toHaveBeenCalledWith('theme:register', { name: 'ocean' })
      expect(callHost).toHaveBeenCalledWith('iconpack:register', { name: 'lucide' })
    })

    it('getSyncPayload omits registeredEntries when nothing was registered', () => {
      const { getSyncPayload } = build()
      expect(getSyncPayload().registeredEntries).toBeUndefined()
    })
  })

  describe('i18n.t', () => {
    it('returns the key itself when no translation is loaded', () => {
      const { core } = build()
      expect(core.i18n.t('greeting')).toBe('greeting')
    })

    it('defaults to locale "en" and dir "ltr" before initI18n runs', () => {
      const { core } = build()
      expect(core.i18n.locale).toBe('en')
      expect(core.i18n.dir).toBe('ltr')
    })
  })

  describe('config.get', () => {
    it('unwraps the .data field from the broker response', async () => {
      callHost.mockResolvedValue({ success: true, data: { theme: 'dark' } })
      const { core } = build()
      const result = await core.config.get()
      expect(callHost).toHaveBeenCalledWith('broker:invoke', {
        targetId: 'kernel',
        channel: 'getConfig',
      })
      expect(result).toEqual({ theme: 'dark' })
    })
  })

  describe('extensions.invoke', () => {
    it('forwards to callHost with target/channel/payload', async () => {
      const { core } = build()
      await core.extensions.invoke('com.nuxy.other', 'doThing', { a: 1 })
      expect(callHost).toHaveBeenCalledWith('broker:invoke', {
        targetId: 'com.nuxy.other',
        channel: 'doThing',
        payload: { a: 1 },
      })
    })
  })
})
