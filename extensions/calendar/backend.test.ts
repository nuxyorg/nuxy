// fallow-ignore-file code-duplication
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { type CoreContext, createMockCore } from '@nuxy/extension-sdk'
import type { DbHandle, PreparedStatement } from '@nuxy/core'

interface MockDb {
  db: DbHandle
  mockPrepare: ReturnType<typeof vi.fn>
  preparedStmt: PreparedStatement
}

function makeMockDb(rows: unknown[] = [], getRow: unknown = null): MockDb {
  const preparedStmt = {
    run: vi.fn(),
    get: vi.fn().mockReturnValue(getRow),
    all: vi.fn().mockReturnValue(rows),
  } as unknown as PreparedStatement
  const mockPrepare = vi.fn().mockReturnValue(preparedStmt)
  const db = {
    exec: vi.fn(),
    prepare: mockPrepare,
    close: vi.fn(),
    function: vi.fn(),
  } as unknown as DbHandle
  return { db, mockPrepare, preparedStmt }
}

function createCore(dbOverride: MockDb | null = null): {
  core: CoreContext
  handlers: Record<string, (payload?: unknown) => Promise<unknown>>
  db: DbHandle
  mockPrepare: ReturnType<typeof vi.fn>
  preparedStmt: PreparedStatement
} {
  const { db, mockPrepare, preparedStmt } = dbOverride ?? makeMockDb()
  const { core, handlers } = createMockCore({
    db: { open: vi.fn().mockReturnValue(db) },
  })
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
      const mockDb = makeMockDb([], eventRow)
      const { core, handlers, preparedStmt } = createCore(mockDb)

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

      const mockDb = makeMockDb()
      ;(mockDb.preparedStmt.get as ReturnType<typeof vi.fn>).mockReturnValue({
        id: 'some-uuid',
        title: 'Test',
        datetime: now,
        notes: '',
        remind_min: 0,
        created_at: now,
      })
      const { core, handlers } = createCore(mockDb)

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
      const mockDb = makeMockDb([eventRow])
      const { core, handlers, preparedStmt } = createCore(mockDb)

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

      const mockDb = makeMockDb([])
      const { core, handlers, preparedStmt } = createCore(mockDb)

      const { register } = await freshBackend()
      register(core)

      await handlers['calendar:list']({ from, to })

      const callArgs = (preparedStmt.all as ReturnType<typeof vi.fn>).mock.calls[0] as unknown[]
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
      const mockDb = makeMockDb([], existing)
      const { core, handlers, mockPrepare } = createCore(mockDb)

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
      const mockDb = makeMockDb([], updated)
      const { core, handlers } = createCore(mockDb)

      const { register } = await freshBackend()
      register(core)

      const result = await handlers['calendar:update']({ id: 'evt-1', title: 'New title' })
      expect(result).toMatchObject({ id: 'evt-1', title: 'New title' })
    })
  })

  describe('calendar:delete', () => {
    it('runs DELETE by id', async () => {
      const mockDb = makeMockDb()
      const { core, handlers, mockPrepare, preparedStmt } = createCore(mockDb)

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

      const mockDb = makeMockDb([event])
      const { core, db } = createCore(mockDb)

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

      const mockDb = makeMockDb([event])
      const { core, db } = createCore(mockDb)

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

      const mockDb = makeMockDb([event])
      const { core, db } = createCore(mockDb)

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

      const mockDb = makeMockDb([event])
      const { core, db } = createCore(mockDb)
      core.extensions.invoke = vi.fn().mockRejectedValue(new Error('notification bridge offline'))

      const { register, checkReminders } = await freshBackend()
      register(core)

      await expect(checkReminders(core, () => db)).resolves.not.toThrow()
    })
  })

  describe('getLastResult, setLastResult, and prepare', () => {
    it('sets and gets the last result, clearing it after get', async () => {
      const { core, handlers } = createCore()
      const { register } = await freshBackend()
      register(core)

      // Initial getLastResult should be null
      const initial = await handlers['getLastResult']({})
      expect(initial).toBeNull()

      // Set last result
      const payload = { success: true, data: { title: 'party', datetime: 12345 } }
      const setRes = await handlers['setLastResult'](payload)
      expect(setRes).toEqual({ ok: true })

      // Get last result
      const getRes = await handlers['getLastResult']({})
      expect(getRes).toEqual(payload)

      // Subsequent getLastResult should be null (cleared)
      const after = await handlers['getLastResult']({})
      expect(after).toBeNull()
    })

    it('prepares date and time arguments correctly', async () => {
      const { core, handlers } = createCore()
      const { register } = await freshBackend()
      register(core)

      const res = await handlers['calendar:prepare']({
        title: 'recebin doğumgününü kutlayacağım',
        date: '2026-12-21',
        time: '10:00',
      })
      expect(res).toEqual({
        success: true,
        data: {
          title: 'recebin doğumgününü kutlayacağım',
          datetime: new Date(2026, 11, 21, 10, 0, 0, 0).getTime(),
        },
      })
    })

    it('returns error when date parameter is missing or invalid', async () => {
      const { core, handlers } = createCore()
      const { register } = await freshBackend()
      register(core)

      const res1 = await handlers['calendar:prepare']({
        title: 'party',
      })
      expect(res1).toHaveProperty('success', false)

      const res2 = await handlers['calendar:prepare']({
        title: 'party',
        date: 'invalid-date',
      })
      expect(res2).toHaveProperty('success', false)
    })
  })
})

// ── Edge cases ────────────────────────────────────────────────────────────────

describe('calendar backend — edge cases', () => {
  describe('calendar:create', () => {
    it('defaults remindMin to 0 when omitted', async () => {
      const now = 1700000000000
      vi.spyOn(Date, 'now').mockReturnValue(now)

      const row = {
        id: 'uuid-1',
        title: 'No reminder',
        datetime: now,
        notes: '',
        remind_min: 0,
        created_at: now,
      }
      const mockDb = makeMockDb([], row)
      const { core, handlers } = createCore(mockDb)

      const { register } = await freshBackend()
      register(core)

      const result = (await handlers['calendar:create']({
        title: 'No reminder',
        datetime: now,
        // remindMin intentionally omitted
      })) as { remindMin: number }

      expect(result.remindMin).toBe(0)
    })

    it('defaults notes to empty string when omitted', async () => {
      const now = 1700000000000
      vi.spyOn(Date, 'now').mockReturnValue(now)

      const row = {
        id: 'uuid-2',
        title: 'No notes',
        datetime: now,
        notes: '',
        remind_min: 0,
        created_at: now,
      }
      const mockDb = makeMockDb([], row)
      const { core, handlers } = createCore(mockDb)

      const { register } = await freshBackend()
      register(core)

      const result = (await handlers['calendar:create']({
        title: 'No notes',
        datetime: now,
      })) as { notes: string }

      expect(typeof result.notes).toBe('string')
    })
  })

  describe('calendar:list', () => {
    it('uses BETWEEN (inclusive) — event AT exactly from is included', async () => {
      const from = 1700000000000
      const to = 1700100000000

      const mockDb = makeMockDb([])
      const { core, handlers, preparedStmt } = createCore(mockDb)

      const { register } = await freshBackend()
      register(core)

      await handlers['calendar:list']({ from, to })

      // SQL BETWEEN is inclusive — the prepared statement should receive
      // both from and to as-is (not modified)
      const args = (preparedStmt.all as ReturnType<typeof vi.fn>).mock.calls[0] as unknown[]
      expect(args[0]).toBe(from)
      expect(args[1]).toBe(to)
    })

    it('with no payload returns all events (no WHERE clause)', async () => {
      const row = {
        id: 'all',
        title: 'Any event',
        datetime: 0,
        notes: '',
        remind_min: 0,
        created_at: 0,
      }
      const mockDb = makeMockDb([row])
      const { core, handlers, preparedStmt } = createCore(mockDb)

      const { register } = await freshBackend()
      register(core)

      const result = (await handlers['calendar:list']({})) as unknown[]
      // all() called with no args for the unbounded query
      expect(preparedStmt.all).toHaveBeenCalledWith()
      expect(result).toHaveLength(1)
    })
  })

  describe('calendar:update', () => {
    it('does nothing (no SET clauses) when called with only id', async () => {
      const now = 1700000000000
      const row = {
        id: 'evt-x',
        title: 'Unchanged',
        datetime: now,
        notes: '',
        remind_min: 0,
        created_at: now,
      }
      const mockDb = makeMockDb([], row)
      const { core, handlers, mockPrepare } = createCore(mockDb)

      const { register } = await freshBackend()
      register(core)

      // Should not throw, and should not issue an UPDATE
      await handlers['calendar:update']({ id: 'evt-x' })

      const updateCalled = mockPrepare.mock.calls.some(
        ([sql]: [string]) => typeof sql === 'string' && sql.toUpperCase().includes('UPDATE')
      )
      expect(updateCalled).toBe(false)
    })

    it('can update all fields at once', async () => {
      const now = 1700000000000
      const updated = {
        id: 'evt-full',
        title: 'New title',
        datetime: now + 1000,
        notes: 'Updated notes',
        remind_min: 60,
        created_at: now,
      }
      const mockDb = makeMockDb([], updated)
      const { core, handlers, mockPrepare } = createCore(mockDb)

      const { register } = await freshBackend()
      register(core)

      await handlers['calendar:update']({
        id: 'evt-full',
        title: 'New title',
        datetime: now + 1000,
        notes: 'Updated notes',
        remindMin: 60,
      })

      const updateCall = mockPrepare.mock.calls.find(
        ([sql]: [string]) => typeof sql === 'string' && sql.toUpperCase().includes('UPDATE')
      )
      expect(updateCall).toBeDefined()
      const sql = updateCall[0] as string
      expect(sql).toMatch(/title/i)
      expect(sql).toMatch(/datetime/i)
      expect(sql).toMatch(/notes/i)
      expect(sql).toMatch(/remind_min/i)
    })
  })

  describe('calendar:delete', () => {
    it('passes only the id to DELETE — no extra args', async () => {
      const mockDb = makeMockDb()
      const { core, handlers, preparedStmt } = createCore(mockDb)

      const { register } = await freshBackend()
      register(core)

      await handlers['calendar:delete']({ id: 'gone' })

      expect(preparedStmt.run).toHaveBeenCalledTimes(1)
      expect(preparedStmt.run).toHaveBeenCalledWith('gone')
    })

    it('does not throw when id does not exist (DELETE is idempotent)', async () => {
      const mockDb = makeMockDb()
      const { core, handlers } = createCore(mockDb)

      const { register } = await freshBackend()
      register(core)

      await expect(handlers['calendar:delete']({ id: 'nonexistent' })).resolves.not.toThrow()
    })
  })
})
