import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { CoreContext } from '@nuxy/extension-sdk'

interface MockPreparedStmt {
  run: ReturnType<typeof vi.fn>
  get: ReturnType<typeof vi.fn>
  all: ReturnType<typeof vi.fn>
}

interface MockDb {
  exec: ReturnType<typeof vi.fn>
  prepare: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
}

function makeMockDb(
  rows: unknown[] = [],
  getRow: unknown = null
): { db: MockDb; mockPrepare: ReturnType<typeof vi.fn>; preparedStmt: MockPreparedStmt } {
  const preparedStmt: MockPreparedStmt = {
    run: vi.fn(),
    get: vi.fn().mockReturnValue(getRow),
    all: vi.fn().mockReturnValue(rows),
  }
  const mockPrepare = vi.fn().mockReturnValue(preparedStmt)
  const db: MockDb = {
    exec: vi.fn(),
    prepare: mockPrepare,
    close: vi.fn(),
  }
  return { db, mockPrepare, preparedStmt }
}

function createCore(
  dbOverride: {
    db: MockDb
    mockPrepare: ReturnType<typeof vi.fn>
    preparedStmt: MockPreparedStmt
  } | null = null
): {
  core: CoreContext
  handlers: Record<string, (payload?: unknown) => Promise<unknown>>
  db: MockDb
  mockPrepare: ReturnType<typeof vi.fn>
  preparedStmt: MockPreparedStmt
} {
  const { db, mockPrepare, preparedStmt } = dbOverride ?? makeMockDb()
  const handlers: Record<string, (payload?: unknown) => Promise<unknown>> = {}
  const core = {
    registry: {
      registerTool: vi.fn(),
      registerProvider: vi.fn(),
      registerOrchestrator: vi.fn(),
      registerTheme: vi.fn(),
      registerIconPack: vi.fn(),
    },
    ipc: {
      handle: (ch: string, fn: (payload?: unknown) => Promise<unknown>) => {
        handlers[ch] = fn
      },
    },
    extensions: { invoke: vi.fn().mockResolvedValue(undefined) },
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), silly: vi.fn() },
    db: { open: vi.fn().mockReturnValue(db) },
    storage: { read: vi.fn().mockResolvedValue(null), write: vi.fn().mockResolvedValue(undefined) },
    clipboard: {
      readText: vi.fn(),
      writeText: vi.fn(),
      readImage: vi.fn(),
      writeImage: vi.fn(),
      writeFiles: vi.fn(),
    },
    fs: {
      fileExists: vi.fn().mockResolvedValue(false),
      readDir: vi.fn(),
      readFile: vi.fn(),
      readFileBinary: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      rename: vi.fn(),
      rm: vi.fn(),
      stat: vi.fn(),
      homedir: vi.fn().mockReturnValue('/home/user'),
      tmpdir: vi.fn().mockReturnValue('/tmp'),
    },
    shell: { open: vi.fn(), exec: vi.fn(), spawn: vi.fn() },
    media: { getNowPlaying: vi.fn() },
    config: { get: vi.fn() },
  } as CoreContext
  return { core, handlers, db, mockPrepare, preparedStmt }
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function freshBackend(): Promise<{
  register: (core: CoreContext) => void
  checkReminders: (core: CoreContext, getDb: () => unknown) => Promise<void>
}> {
  const mod = await import('./backend.ts')
  return { register: mod.register, checkReminders: mod.checkReminders }
}

describe('calendar backend', () => {
  it('registers as a tool named "calendar"', async () => {
    const { register } = await freshBackend()
    const { core } = createCore()
    register(core)
    expect(core.registry.registerTool).toHaveBeenCalledWith({ name: 'calendar' })
  })

  describe('calendar:create', () => {
    it('inserts a row with correct fields and returns the event', async () => {
      const now = 1700000000000
      vi.spyOn(Date, 'now').mockReturnValue(now)

      const eventRow = {
        id: 'test-uuid',
        title: 'Team meeting',
        datetime: 1700010000000,
        notes: 'Room B',
        remind_min: 15,
        created_at: now,
      }
      const { db, preparedStmt } = makeMockDb([], eventRow)
      const { core, handlers } = createCore({ db, mockPrepare: db.prepare, preparedStmt })
      core.db.open.mockReturnValue(db)

      const { register } = await freshBackend()
      register(core)

      const result = (await handlers['calendar:create']({
        title: 'Team meeting',
        datetime: 1700010000000,
        notes: 'Room B',
        remindMin: 15,
      })) as { title: string; datetime: number; notes: string; remindMin: number }

      expect(preparedStmt.run).toHaveBeenCalled()
      expect(result).toMatchObject({
        title: 'Team meeting',
        datetime: 1700010000000,
        notes: 'Room B',
        remindMin: 15,
      })
    })

    it('generates a unique id (string)', async () => {
      const now = 1700000000000
      vi.spyOn(Date, 'now').mockReturnValue(now)

      const { db, preparedStmt } = makeMockDb()
      preparedStmt.get.mockReturnValue({
        id: 'some-uuid',
        title: 'Test',
        datetime: now,
        notes: '',
        remind_min: 0,
        created_at: now,
      })

      const { core, handlers } = createCore()
      core.db.open.mockReturnValue(db)

      const { register } = await freshBackend()
      register(core)

      const result = (await handlers['calendar:create']({ title: 'Test', datetime: now })) as {
        id: string
      }
      expect(typeof result.id).toBe('string')
      expect(result.id.length).toBeGreaterThan(0)
    })
  })

  describe('calendar:list', () => {
    it('calls SELECT and maps rows to Event objects', async () => {
      const now = 1700000000000
      const eventRow = {
        id: 'abc',
        title: 'Lunch',
        datetime: now + 3600000,
        notes: '',
        remind_min: 0,
        created_at: now,
      }
      const { db, preparedStmt } = makeMockDb([eventRow])
      const { core, handlers } = createCore()
      core.db.open.mockReturnValue(db)

      const { register } = await freshBackend()
      register(core)

      const result = (await handlers['calendar:list']({})) as Array<{
        id: string
        title: string
        datetime: number
        notes: string
        remindMin: number
        createdAt: number
      }>
      expect(preparedStmt.all).toHaveBeenCalled()
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'abc',
        title: 'Lunch',
        datetime: now + 3600000,
        notes: '',
        remindMin: 0,
        createdAt: now,
      })
    })

    it('with from/to passes them as WHERE bounds', async () => {
      const from = 1700000000000
      const to = 1700100000000

      const { db, preparedStmt } = makeMockDb([])
      const { core, handlers } = createCore()
      core.db.open.mockReturnValue(db)

      const { register } = await freshBackend()
      register(core)

      await handlers['calendar:list']({ from, to })

      const callArgs = preparedStmt.all.mock.calls[0] as unknown[]
      expect(callArgs).toContain(from)
      expect(callArgs).toContain(to)
    })
  })

  describe('calendar:update', () => {
    it('only updates provided fields (partial update)', async () => {
      const now = 1700000000000
      vi.spyOn(Date, 'now').mockReturnValue(now)

      const existing = {
        id: 'evt-1',
        title: 'Old title',
        datetime: now,
        notes: '',
        remind_min: 0,
        created_at: now,
      }
      const { db, mockPrepare, preparedStmt } = makeMockDb([], existing)
      const { core, handlers } = createCore()
      core.db.open.mockReturnValue(db)

      const { register } = await freshBackend()
      register(core)

      await handlers['calendar:update']({ id: 'evt-1', title: 'New title' })

      const updateCall = mockPrepare.mock.calls.find(
        ([sql]: [string]) => typeof sql === 'string' && sql.toUpperCase().includes('UPDATE')
      )
      expect(updateCall).toBeDefined()
      const updateSql = updateCall[0] as string
      expect(updateSql).toMatch(/title/i)
      expect(updateSql).not.toMatch(/notes/i)
    })

    it('returns the updated event', async () => {
      const now = 1700000000000
      const updated = {
        id: 'evt-1',
        title: 'New title',
        datetime: now,
        notes: '',
        remind_min: 0,
        created_at: now,
      }
      const { db, preparedStmt } = makeMockDb([], updated)
      const { core, handlers } = createCore()
      core.db.open.mockReturnValue(db)

      const { register } = await freshBackend()
      register(core)

      const result = await handlers['calendar:update']({ id: 'evt-1', title: 'New title' })
      expect(result).toMatchObject({ id: 'evt-1', title: 'New title' })
    })
  })

  describe('calendar:delete', () => {
    it('runs DELETE by id', async () => {
      const { db, mockPrepare, preparedStmt } = makeMockDb()
      const { core, handlers } = createCore()
      core.db.open.mockReturnValue(db)

      const { register } = await freshBackend()
      register(core)

      await handlers['calendar:delete']({ id: 'evt-99' })

      const deleteCall = mockPrepare.mock.calls.find(
        ([sql]: [string]) => typeof sql === 'string' && sql.toUpperCase().includes('DELETE')
      )
      expect(deleteCall).toBeDefined()
      expect(preparedStmt.run).toHaveBeenCalledWith('evt-99')
    })
  })

  describe('checkReminders', () => {
    it('fires notification:send for events whose reminder time is now', async () => {
      const now = 1700000060000
      vi.spyOn(Date, 'now').mockReturnValue(now)

      const remindMin = 15
      const eventDatetime = now + remindMin * 60 * 1000
      const event = {
        id: 'evt-r1',
        title: 'Stand-up',
        datetime: eventDatetime,
        notes: '',
        remind_min: remindMin,
        created_at: now - 1000,
      }

      const { db, preparedStmt } = makeMockDb([event])
      const { core } = createCore()
      core.db.open.mockReturnValue(db)

      const { register, checkReminders } = await freshBackend()
      register(core)

      await checkReminders(core, () => db)

      expect(core.extensions.invoke).toHaveBeenCalledWith(
        'kernel',
        'notification:send',
        expect.objectContaining({ title: 'Reminder', body: 'Stand-up' })
      )
    })

    it('does NOT fire for events with remind_min = 0', async () => {
      const now = 1700000060000
      vi.spyOn(Date, 'now').mockReturnValue(now)

      const event = {
        id: 'evt-r2',
        title: 'No reminder',
        datetime: now + 1000,
        notes: '',
        remind_min: 0,
        created_at: now - 1000,
      }

      const { db } = makeMockDb([event])
      const { core } = createCore()
      core.db.open.mockReturnValue(db)

      const { register, checkReminders } = await freshBackend()
      register(core)

      await checkReminders(core, () => db)

      expect(core.extensions.invoke).not.toHaveBeenCalled()
    })

    it('does NOT fire for events whose reminder time has already passed', async () => {
      const now = 1700000060000
      vi.spyOn(Date, 'now').mockReturnValue(now)

      const remindMin = 15
      const pastDatetime = now - remindMin * 60 * 1000 - 70000

      const event = {
        id: 'evt-r3',
        title: 'Past event',
        datetime: pastDatetime,
        notes: '',
        remind_min: remindMin,
        created_at: now - 100000,
      }

      const { db } = makeMockDb([event])
      const { core } = createCore()
      core.db.open.mockReturnValue(db)

      const { register, checkReminders } = await freshBackend()
      register(core)

      await checkReminders(core, () => db)

      expect(core.extensions.invoke).not.toHaveBeenCalled()
    })

    it('catches and ignores errors from core.extensions.invoke', async () => {
      const now = 1700000060000
      vi.spyOn(Date, 'now').mockReturnValue(now)

      const remindMin = 5
      const eventDatetime = now + remindMin * 60 * 1000
      const event = {
        id: 'evt-r4',
        title: 'Noisy event',
        datetime: eventDatetime,
        notes: '',
        remind_min: remindMin,
        created_at: now - 1000,
      }

      const { db } = makeMockDb([event])
      const { core } = createCore()
      core.db.open.mockReturnValue(db)
      core.extensions.invoke = vi.fn().mockRejectedValue(new Error('notification bridge offline'))

      const { register, checkReminders } = await freshBackend()
      register(core)

      await expect(checkReminders(core, () => db)).resolves.not.toThrow()
    })
  })
})
