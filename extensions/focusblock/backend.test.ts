import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { type CoreContext, createMockCore } from '@nuxy/extension-sdk'
import type { TimerStatus, Session } from './types.ts'
import { register } from './backend.ts'

describe('focusblock backend', () => {
  let core: CoreContext
  let handlers: Record<string, (payload?: unknown) => unknown>

  beforeEach(() => {
    vi.useFakeTimers()
    const result = createMockCore()
    core = result.core
    handlers = result.handlers as Record<string, (payload?: unknown) => unknown>
    register(core)
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('registers a tool named "focusblock"', () => {
    expect(core.registry.registerTool).toHaveBeenCalledWith({ name: 'focusblock' })
  })

  describe('focusblock:status', () => {
    it('returns inactive when no timer is running', () => {
      const status = handlers['focusblock:status']() as TimerStatus
      expect(status.active).toBe(false)
      expect(status.remaining).toBe(0)
      expect(status.percent).toBe(0)
      expect(status.label).toBe('')
    })

    it('returns active state with correct time calculations', async () => {
      await (handlers['focusblock:start'] as (p: unknown) => Promise<TimerStatus>)({ duration: 25 })
      vi.advanceTimersByTime(5 * 60 * 1000)
      const status = handlers['focusblock:status']() as TimerStatus
      expect(status.active).toBe(true)
      expect(status.elapsed).toBe(5 * 60 * 1000)
      expect(status.remaining).toBe(20 * 60 * 1000)
      expect(status.percent).toBe(20)
    })
  })

  describe('focusblock:start', () => {
    it('starts a timer with default duration of 25 minutes', async () => {
      const status = await (handlers['focusblock:start'] as (p: unknown) => Promise<TimerStatus>)({})
      expect(status.active).toBe(true)
      expect(status.duration).toBe(25 * 60 * 1000)
    })

    it('starts a timer with the provided duration', async () => {
      const status = await (handlers['focusblock:start'] as (p: unknown) => Promise<TimerStatus>)({ duration: 45 })
      expect(status.active).toBe(true)
      expect(status.duration).toBe(45 * 60 * 1000)
    })

    it('sets the provided label', async () => {
      const status = await (handlers['focusblock:start'] as (p: unknown) => Promise<TimerStatus>)({ duration: 25, label: 'deep work' })
      expect(status.label).toBe('deep work')
    })

    it('saves previous session as incomplete when starting while another is active', async () => {
      await (handlers['focusblock:start'] as (p: unknown) => Promise<TimerStatus>)({ duration: 25, label: 'first' })
      await (handlers['focusblock:start'] as (p: unknown) => Promise<TimerStatus>)({ duration: 30, label: 'second' })
      expect(core.storage.write).toHaveBeenCalledWith(
        'history.json',
        expect.arrayContaining([
          expect.objectContaining({ completed: false, label: 'first' }),
        ]),
      )
    })

    it('returns active status immediately after starting', async () => {
      const status = await (handlers['focusblock:start'] as (p: unknown) => Promise<TimerStatus>)({ duration: 25, label: 'focus' })
      expect(status.active).toBe(true)
      expect(status.label).toBe('focus')
      expect(status.elapsed).toBe(0)
      expect(status.remaining).toBe(25 * 60 * 1000)
      expect(status.percent).toBe(0)
    })
  })

  describe('focusblock:stop', () => {
    it('saves session as incomplete and clears the timer', async () => {
      await (handlers['focusblock:start'] as (p: unknown) => Promise<TimerStatus>)({ duration: 25, label: 'work' })
      await (handlers['focusblock:stop'] as () => Promise<void>)()
      expect(core.storage.write).toHaveBeenCalledWith(
        'history.json',
        expect.arrayContaining([
          expect.objectContaining({ completed: false, label: 'work' }),
        ]),
      )
      const status = handlers['focusblock:status']() as TimerStatus
      expect(status.active).toBe(false)
    })

    it('does nothing and resolves when no timer is active', async () => {
      await expect((handlers['focusblock:stop'] as () => Promise<void>)()).resolves.toBeUndefined()
      expect(core.storage.write).not.toHaveBeenCalled()
    })
  })

  describe('focusblock:history', () => {
    it('returns empty array when no history exists', async () => {
      const history = await (handlers['focusblock:history'] as () => Promise<Session[]>)()
      expect(history).toEqual([])
    })

    it('returns sessions from storage', async () => {
      const sessions: Session[] = [
        {
          id: 'abc',
          label: 'work',
          duration: 25 * 60 * 1000,
          startedAt: 1000,
          endedAt: 2000,
          completed: true,
        },
      ]
      ;(core.storage.read as ReturnType<typeof vi.fn>).mockResolvedValueOnce(sessions)
      const history = await (handlers['focusblock:history'] as () => Promise<Session[]>)()
      expect(history).toEqual(sessions)
    })
  })

  describe('focusblock:getSettings', () => {
    it('returns defaultDuration from settings (null → 25)', async () => {
      const settings = await (handlers['focusblock:getSettings'] as () => Promise<{ defaultDuration: number }>)()
      expect(settings.defaultDuration).toBe(25)
    })

    it('returns saved defaultDuration when set', async () => {
      ;(core.settings.read as ReturnType<typeof vi.fn>).mockResolvedValueOnce(45)
      const settings = await (handlers['focusblock:getSettings'] as () => Promise<{ defaultDuration: number }>)()
      expect(settings.defaultDuration).toBe(45)
    })
  })

  describe('auto-complete', () => {
    it('saves a completed session to history when the timer expires', async () => {
      await (handlers['focusblock:start'] as (p: unknown) => Promise<TimerStatus>)({ duration: 1, label: 'test' })
      await vi.advanceTimersByTimeAsync(60 * 1000)
      expect(core.storage.write).toHaveBeenCalledWith(
        'history.json',
        expect.arrayContaining([
          expect.objectContaining({ completed: true, label: 'test' }),
        ]),
      )
    })

    it('clears active timer after auto-complete', async () => {
      await (handlers['focusblock:start'] as (p: unknown) => Promise<TimerStatus>)({ duration: 1 })
      await vi.advanceTimersByTimeAsync(60 * 1000)
      const status = handlers['focusblock:status']() as TimerStatus
      expect(status.active).toBe(false)
    })
  })
})
