import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { type CoreContext, createMockCore } from '@nuxy/extension-sdk'
import type { Reminder, ParsedReminder } from './types.ts'
import { register } from './backend.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Handler = (payload?: unknown) => Promise<unknown>

function getHandler(handlers: Record<string, Handler>, name: string): Handler {
  const h = handlers[name]
  if (!h) throw new Error(`Handler "${name}" not registered`)
  return h
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

/** A simple stateful storage that mirrors write → read for tests. */
function makeStatefulStorage() {
  const store: Record<string, unknown> = {}
  return {
    read: vi.fn((file: string) => Promise.resolve(store[file] ?? null)),
    write: vi.fn((file: string, data: unknown) => {
      store[file] = data
      return Promise.resolve(undefined)
    }),
  }
}

describe('remind backend', () => {
  let core: CoreContext
  let handlers: Record<string, Handler>

  beforeEach(() => {
    vi.useFakeTimers()
    const result = createMockCore({
      storage: makeStatefulStorage(),
      notifications: {
        send: vi.fn().mockResolvedValue(undefined),
      },
    })
    core = result.core
    handlers = result.handlers as Record<string, Handler>
    register(core)
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // -------------------------------------------------------------------------
  // Registration
  // -------------------------------------------------------------------------

  it('registers a tool named "remind"', () => {
    expect(core.registry.registerTool).toHaveBeenCalledWith(expect.objectContaining({ name: 'remind' }))
  })

  it('registers all four IPC channels', () => {
    expect(handlers['remind:create']).toBeDefined()
    expect(handlers['remind:list']).toBeDefined()
    expect(handlers['remind:cancel']).toBeDefined()
    expect(handlers['remind:parse']).toBeDefined()
  })

  // -------------------------------------------------------------------------
  // remind:parse
  // -------------------------------------------------------------------------

  describe('remind:parse', () => {
    it('parses a relative minute token', async () => {
      const result = (await getHandler(handlers, 'remind:parse')({ text: '20m meeting' })) as ParsedReminder
      expect(result).not.toBeNull()
      expect(result.label).toBe('meeting')
      expect(result.delayMs).toBe(20 * 60_000)
    })

    it('parses a relative second token', async () => {
      const result = (await getHandler(handlers, 'remind:parse')({ text: '30s quick ping' })) as ParsedReminder
      expect(result).not.toBeNull()
      expect(result.delayMs).toBe(30_000)
      expect(result.label).toBe('quick ping')
    })

    it('parses a relative hour token', async () => {
      const result = (await getHandler(handlers, 'remind:parse')({ text: '2h lunch' })) as ParsedReminder
      expect(result).not.toBeNull()
      expect(result.delayMs).toBe(2 * 3_600_000)
    })

    it('parses a relative day token', async () => {
      const result = (await getHandler(handlers, 'remind:parse')({ text: '1d review' })) as ParsedReminder
      expect(result).not.toBeNull()
      expect(result.delayMs).toBe(86_400_000)
    })

    it('returns null for unrecognised text', async () => {
      const result = await getHandler(handlers, 'remind:parse')({ text: 'hello world' })
      expect(result).toBeNull()
    })

    it('returns null for empty text', async () => {
      const result = await getHandler(handlers, 'remind:parse')({ text: '' })
      expect(result).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // remind:create
  // -------------------------------------------------------------------------

  describe('remind:create', () => {
    it('creates and returns a Reminder with correct fields', async () => {
      const reminder = (await getHandler(handlers, 'remind:create')({ text: '5m standup' })) as Reminder
      expect(reminder.id).toBeTruthy()
      expect(reminder.label).toBe('standup')
      expect(reminder.fired).toBe(false)
      expect(typeof reminder.fireAt).toBe('number')
      expect(typeof reminder.createdAt).toBe('number')
    })

    it('persists the reminder to storage', async () => {
      await getHandler(handlers, 'remind:create')({ text: '10m call' })
      expect(core.storage.write).toHaveBeenCalledWith(
        'reminders.json',
        expect.arrayContaining([expect.objectContaining({ label: 'call', fired: false })]),
      )
    })

    it('fires a notification after the delay elapses', async () => {
      await getHandler(handlers, 'remind:create')({ text: '1m test notification' })
      // Before timeout — no notification yet
      expect(core.notifications.send).not.toHaveBeenCalled()
      // Advance past the delay
      await vi.advanceTimersByTimeAsync(60_000)
      expect(core.notifications.send).toHaveBeenCalledWith(
        expect.objectContaining({ body: 'test notification' }),
      )
    })

    it('throws for invalid input text', async () => {
      await expect(getHandler(handlers, 'remind:create')({ text: 'not a time' })).rejects.toThrow()
    })

    it('uses a fallback label when none is provided', async () => {
      const reminder = (await getHandler(handlers, 'remind:create')({ text: '5m' })) as Reminder
      // label should be non-empty (filled in by i18n fallback or default)
      expect(typeof reminder.label).toBe('string')
      expect(reminder.label.length).toBeGreaterThan(0)
    })
  })

  // -------------------------------------------------------------------------
  // remind:list
  // -------------------------------------------------------------------------

  describe('remind:list', () => {
    it('returns an empty array when there are no reminders', async () => {
      const list = (await getHandler(handlers, 'remind:list')()) as Reminder[]
      expect(list).toEqual([])
    })

    it('returns only unfired reminders sorted by fireAt', async () => {
      const existing: Reminder[] = [
        { id: 'b', label: 'later', fireAt: 3000, createdAt: 0, fired: false },
        { id: 'a', label: 'soon', fireAt: 1000, createdAt: 0, fired: false },
        { id: 'c', label: 'done', fireAt: 500, createdAt: 0, fired: true },
      ]
      ;(core.storage.read as ReturnType<typeof vi.fn>).mockResolvedValueOnce(existing)
      const list = (await getHandler(handlers, 'remind:list')()) as Reminder[]
      expect(list.map((r) => r.id)).toEqual(['a', 'b'])
    })

    it('excludes fired reminders', async () => {
      const existing: Reminder[] = [
        { id: 'x', label: 'fired', fireAt: 100, createdAt: 0, fired: true },
      ]
      ;(core.storage.read as ReturnType<typeof vi.fn>).mockResolvedValueOnce(existing)
      const list = (await getHandler(handlers, 'remind:list')()) as Reminder[]
      expect(list).toHaveLength(0)
    })
  })

  // -------------------------------------------------------------------------
  // remind:cancel
  // -------------------------------------------------------------------------

  describe('remind:cancel', () => {
    it('marks the reminder as fired and removes it from the active list', async () => {
      const reminder = (await getHandler(handlers, 'remind:create')({ text: '30m work' })) as Reminder

      // Reset write mock so we can inspect the cancel write clearly
      vi.mocked(core.storage.write).mockClear()

      // Mock read to return the reminder that was just "saved"
      ;(core.storage.read as ReturnType<typeof vi.fn>).mockResolvedValue([{ ...reminder, fired: false }])

      await getHandler(handlers, 'remind:cancel')({ id: reminder.id })

      expect(core.storage.write).toHaveBeenCalledWith(
        'reminders.json',
        expect.arrayContaining([expect.objectContaining({ id: reminder.id, fired: true })]),
      )
    })

    it('does not fire a notification after cancellation', async () => {
      const reminder = (await getHandler(handlers, 'remind:create')({ text: '1m cancelled' })) as Reminder
      ;(core.storage.read as ReturnType<typeof vi.fn>).mockResolvedValue([{ ...reminder, fired: false }])

      await getHandler(handlers, 'remind:cancel')({ id: reminder.id })

      vi.mocked(core.notifications.send).mockClear()
      await vi.advanceTimersByTimeAsync(60_000)

      // Notification should not have been triggered after cancel
      expect(core.notifications.send).not.toHaveBeenCalled()
    })

    it('resolves without error when the id does not exist', async () => {
      ;(core.storage.read as ReturnType<typeof vi.fn>).mockResolvedValue([])
      await expect(getHandler(handlers, 'remind:cancel')({ id: 'nonexistent' })).resolves.toBeUndefined()
    })
  })

  // -------------------------------------------------------------------------
  // Startup re-schedule
  // -------------------------------------------------------------------------

  describe('startup re-scheduling', () => {
    it('re-schedules unfired reminders loaded from storage', async () => {
      const future = Date.now() + 5 * 60_000
      const storedReminders: Reminder[] = [
        { id: 'r1', label: 'standing meeting', fireAt: future, createdAt: Date.now() - 1000, fired: false },
      ]
      ;(core.storage.read as ReturnType<typeof vi.fn>).mockResolvedValue(storedReminders)

      // Re-register to trigger startup logic with pre-seeded storage
      const result2 = createMockCore({
        storage: {
          read: vi.fn().mockResolvedValue(storedReminders),
          write: vi.fn().mockResolvedValue(undefined),
        },
        notifications: {
          send: vi.fn().mockResolvedValue(undefined),
        },
      })
      register(result2.core)

      await vi.advanceTimersByTimeAsync(5 * 60_000 + 100)

      expect(result2.core.notifications.send).toHaveBeenCalledWith(
        expect.objectContaining({ body: 'standing meeting' }),
      )
    })
  })
})
