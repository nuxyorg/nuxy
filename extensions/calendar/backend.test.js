import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'

vi.mock('node:sqlite', () => ({
  DatabaseSync: vi.fn().mockImplementation(() => ({
    exec: vi.fn(),
    prepare: vi.fn().mockReturnValue({
      run: vi.fn(),
      get: vi.fn().mockReturnValue(null),
      all: vi.fn().mockReturnValue([]),
    }),
    close: vi.fn(),
  })),
}))

function makeMockDb(rows = [], getRow = null) {
  const preparedStmt = {
    run: vi.fn(),
    get: vi.fn().mockReturnValue(getRow),
    all: vi.fn().mockReturnValue(rows),
  }
  const mockPrepare = vi.fn().mockReturnValue(preparedStmt)
  const db = {
    exec: vi.fn(),
    prepare: mockPrepare,
    close: vi.fn(),
  }
  return { db, mockPrepare, preparedStmt }
}

function createCore() {
  const handlers = {}
  const core = {
    registry: { registerTool: vi.fn() },
    ipc: { handle: (ch, fn) => { handlers[ch] = fn } },
    extensions: { invoke: vi.fn().mockResolvedValue(undefined) },
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  }
  return { core, handlers }
}

beforeEach(async () => {
  vi.resetModules()
  vi.spyOn(fs, 'existsSync').mockReturnValue(true)
  vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function freshBackend() {
  const mod = await import('./backend.js')
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

      const { DatabaseSync } = await import('node:sqlite')
      const eventRow = {
        id: 'test-uuid',
        title: 'Team meeting',
        datetime: 1700010000000,
        notes: 'Room B',
        remind_min: 15,
        created_at: now,
      }
      const { db, preparedStmt } = makeMockDb([], eventRow)
      DatabaseSync.mockImplementationOnce(() => db)

      const { register } = await freshBackend()
      const { core, handlers } = createCore()
      register(core)

      const result = await handlers['calendar:create']({
        title: 'Team meeting',
        datetime: 1700010000000,
        notes: 'Room B',
        remindMin: 15,
      })

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

      const { DatabaseSync } = await import('node:sqlite')
      const { db, preparedStmt } = makeMockDb()
      preparedStmt.get.mockReturnValue({
        id: 'some-uuid',
        title: 'Test',
        datetime: now,
        notes: '',
        remind_min: 0,
        created_at: now,
      })
      DatabaseSync.mockImplementationOnce(() => db)

      const { register } = await freshBackend()
      const { core, handlers } = createCore()
      register(core)

      const result = await handlers['calendar:create']({ title: 'Test', datetime: now })
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
      const { DatabaseSync } = await import('node:sqlite')
      const { db, preparedStmt } = makeMockDb([eventRow])
      DatabaseSync.mockImplementationOnce(() => db)

      const { register } = await freshBackend()
      const { core, handlers } = createCore()
      register(core)

      const result = await handlers['calendar:list']({})
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

      const { DatabaseSync } = await import('node:sqlite')
      const { db, preparedStmt } = makeMockDb([])
      DatabaseSync.mockImplementationOnce(() => db)

      const { register } = await freshBackend()
      const { core, handlers } = createCore()
      register(core)

      await handlers['calendar:list']({ from, to })

      const callArgs = preparedStmt.all.mock.calls[0]
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
      const { DatabaseSync } = await import('node:sqlite')
      const { db, mockPrepare, preparedStmt } = makeMockDb([], existing)
      DatabaseSync.mockImplementationOnce(() => db)

      const { register } = await freshBackend()
      const { core, handlers } = createCore()
      register(core)

      await handlers['calendar:update']({ id: 'evt-1', title: 'New title' })

      const updateCall = mockPrepare.mock.calls.find(
        ([sql]) => typeof sql === 'string' && sql.toUpperCase().includes('UPDATE')
      )
      expect(updateCall).toBeDefined()
      const updateSql = updateCall[0]
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
      const { DatabaseSync } = await import('node:sqlite')
      const { db, preparedStmt } = makeMockDb([], updated)
      DatabaseSync.mockImplementationOnce(() => db)

      const { register } = await freshBackend()
      const { core, handlers } = createCore()
      register(core)

      const result = await handlers['calendar:update']({ id: 'evt-1', title: 'New title' })
      expect(result).toMatchObject({ id: 'evt-1', title: 'New title' })
    })
  })

  describe('calendar:delete', () => {
    it('runs DELETE by id', async () => {
      const { DatabaseSync } = await import('node:sqlite')
      const { db, mockPrepare, preparedStmt } = makeMockDb()
      DatabaseSync.mockImplementationOnce(() => db)

      const { register } = await freshBackend()
      const { core, handlers } = createCore()
      register(core)

      await handlers['calendar:delete']({ id: 'evt-99' })

      const deleteCall = mockPrepare.mock.calls.find(
        ([sql]) => typeof sql === 'string' && sql.toUpperCase().includes('DELETE')
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

      const { DatabaseSync } = await import('node:sqlite')
      const { db, preparedStmt } = makeMockDb([event])
      DatabaseSync.mockImplementationOnce(() => db)

      const { register, checkReminders } = await freshBackend()
      const { core } = createCore()
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

      const { DatabaseSync } = await import('node:sqlite')
      const { db, preparedStmt } = makeMockDb([event])
      DatabaseSync.mockImplementationOnce(() => db)

      const { register, checkReminders } = await freshBackend()
      const { core } = createCore()
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

      const { DatabaseSync } = await import('node:sqlite')
      const { db, preparedStmt } = makeMockDb([event])
      DatabaseSync.mockImplementationOnce(() => db)

      const { register, checkReminders } = await freshBackend()
      const { core } = createCore()
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

      const { DatabaseSync } = await import('node:sqlite')
      const { db, preparedStmt } = makeMockDb([event])
      DatabaseSync.mockImplementationOnce(() => db)

      const { register, checkReminders } = await freshBackend()
      const { core } = createCore()
      core.extensions.invoke = vi.fn().mockRejectedValue(new Error('notification bridge offline'))
      register(core)

      await expect(checkReminders(core, () => db)).resolves.not.toThrow()
    })
  })
})
