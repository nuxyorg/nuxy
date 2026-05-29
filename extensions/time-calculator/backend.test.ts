import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { type CoreContext, createMockCore } from '@nuxy/extension-sdk'
import { register } from './backend.ts'

// Freeze time at UTC noon so timezone conversions are deterministic.
// UTC 12:00 → Tokyo 21:00 (UTC+9, no DST) → NYC 08:00 (UTC-4 EDT in June)
const FROZEN_UTC = new Date('2025-06-15T12:00:00.000Z')

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FROZEN_UTC)
})

afterAll(() => {
  vi.useRealTimers()
})

/**
 * Each test creates a fresh instance via createCore() + register().
 * `lastResult` is declared with `let` inside register(), so it is
 * closure-scoped — every register() call gets its own isolated state.
 */
function createCore() {
  return createMockCore(vi)
}

describe('time-calculator backend', () => {
  it('registers as a provider', () => {
    const { core } = createCore()
    register(core)
    expect(core.registry.registerProvider as ReturnType<typeof vi.fn>).toHaveBeenCalledWith({
      name: 'time-calculator',
    })
  })

  describe('eval handler', () => {
    it('returns empty items for non-time text', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = (await handlers.eval({ text: 'hello world' })) as { items: unknown[] }
      expect(res.items).toHaveLength(0)
    })

    it('returns empty items for empty input', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = (await handlers.eval({ text: '' })) as { items: unknown[] }
      expect(res.items).toHaveLength(0)
    })

    it('returns hint item when time is given but no city', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = (await handlers.eval({ text: '3pm' })) as {
        items: Array<{ id: string; subtitle: string }>
      }
      expect(res.items).toHaveLength(1)
      expect(res.items[0].id).toBe('time-calc-hint')
      expect(res.items[0].subtitle).toMatch(/city/i)
    })

    it('returns hint for 24h time with no city', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = (await handlers.eval({ text: '14:00' })) as { items: Array<{ id: string }> }
      expect(res.items).toHaveLength(1)
      expect(res.items[0].id).toBe('time-calc-hint')
    })

    it('returns conversion result when city is found in text', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = (await handlers.eval({ text: '12pm in tokyo' })) as {
        items: Array<{ id: string; title: string; subtitle: string }>
      }
      expect(res.items).toHaveLength(1)
      expect(res.items[0].id).toBe('time-calc-result')
      expect(res.items[0].title).toBeTruthy()
      expect(res.items[0].subtitle).toBeTruthy()
    })

    it('result item contains meta with source and dest info', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = (await handlers.eval({ text: '12pm in london' })) as {
        items: Array<{ meta: { left: unknown; right: unknown } }>
      }
      expect(res.items[0].meta).toBeDefined()
      expect(res.items[0].meta.left).toBeDefined()
      expect(res.items[0].meta.right).toBeDefined()
    })

    it('handles undefined payload', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = (await handlers.eval(undefined)) as { items: unknown[] }
      expect(res.items).toHaveLength(0)
    })

    it('recognizes timezone abbreviations like PST', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = (await handlers.eval({ text: '9am in pst' })) as { items: Array<{ id: string }> }
      expect(res.items).toHaveLength(1)
      expect(res.items[0].id).toBe('time-calc-result')
    })

    it('recognizes multi-word city names', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = (await handlers.eval({ text: '12pm in new york' })) as {
        items: Array<{ id: string }>
      }
      expect(res.items).toHaveLength(1)
      expect(res.items[0].id).toBe('time-calc-result')
    })

    it('eval title format contains input text and arrow', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = (await handlers.eval({ text: '12pm in london' })) as {
        items: Array<{ title: string }>
      }
      const item = res.items[0]
      expect(item.title).toMatch(/12pm in london\s*→\s*\d{1,2}:\d{2}/)
    })

    it('eval with 24h format and city returns a result item', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = (await handlers.eval({ text: '15:30 tokyo' })) as { items: Array<{ id: string }> }
      expect(res.items).toHaveLength(1)
      expect(res.items[0].id).toBe('time-calc-result')
    })

    it('eval with 24h format and city subtitle mentions Tokyo', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = (await handlers.eval({ text: '15:30 tokyo' })) as {
        items: Array<{ subtitle: string }>
      }
      expect(res.items[0].subtitle).toMatch(/tokyo/i)
    })
  })

  describe('convert handler', () => {
    it('returns error for missing time parameter', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = (await handlers.convert({})) as { error: string }
      expect(res.error).toMatch(/time/i)
    })

    it('returns error for null payload', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = (await handlers.convert(null)) as { error: string }
      expect(res.error).toMatch(/time/i)
    })

    it('returns error for unparseable time', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = (await handlers.convert({ time: 'not-a-time', to: 'tokyo' })) as {
        error?: string
      }
      expect(res.error).toBeDefined()
    })

    it('returns error for unknown destination city', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = (await handlers.convert({ time: '12pm', to: 'nonexistentcity' })) as {
        error: string
      }
      expect(res.error).toMatch(/nonexistentcity/i)
    })

    it('converts UTC noon to Tokyo (UTC+9 = 21:00)', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = (await handlers.convert({ time: '12pm', from: 'utc', to: 'tokyo' })) as {
        error?: string
        convertedTime: string
      }
      expect(res.error).toBeUndefined()
      expect(res.convertedTime).toMatch(/9:00\s*PM/i)
    })

    it('converts UTC noon to New York (UTC-4 EDT = 08:00)', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = (await handlers.convert({ time: '12pm', from: 'utc', to: 'new york' })) as {
        error?: string
        convertedTime: string
      }
      expect(res.error).toBeUndefined()
      expect(res.convertedTime).toMatch(/8:00\s*AM/i)
    })

    it('accepts "local" as source timezone', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = (await handlers.convert({ time: '9am', from: 'local', to: 'tokyo' })) as {
        error?: string
        convertedTime: string
      }
      expect(res.error).toBeUndefined()
      expect(res.convertedTime).toBeTruthy()
    })

    it('falls back to local timezone when from is an unknown city', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = (await handlers.convert({ time: '12pm', from: 'unknowncity', to: 'tokyo' })) as {
        error?: string
        convertedTime: string
      }
      expect(res.error).toBeUndefined()
      expect(res.convertedTime).toBeTruthy()
    })

    it('returns structured result with required fields', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = await handlers.convert({ time: '3pm', from: 'utc', to: 'london' })
      expect(res).toHaveProperty('originalTime')
      expect(res).toHaveProperty('convertedTime')
      expect(res).toHaveProperty('timezone')
      expect(res).toHaveProperty('tzAbbreviation')
      expect(res).toHaveProperty('meta')
    })

    it('result meta has left and right display fields', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = (await handlers.convert({ time: '3pm', from: 'utc', to: 'tokyo' })) as {
        meta: { left: { text: string; badge: string }; right: { text: string; badge: string } }
      }
      expect(res.meta.left).toHaveProperty('text')
      expect(res.meta.left).toHaveProperty('badge')
      expect(res.meta.right).toHaveProperty('text')
      expect(res.meta.right).toHaveProperty('badge')
    })

    it('meta.left.badge contains the formatted source time', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = (await handlers.convert({ time: '12pm', from: 'utc', to: 'new york' })) as {
        meta: { left: { badge: string } }
      }
      expect(res.meta.left.badge).toMatch(/12:00\s*PM/i)
    })

    it('meta.right.badge contains city name and timezone abbreviation', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = (await handlers.convert({ time: '12pm', from: 'utc', to: 'new york' })) as {
        meta: { right: { badge: string } }
      }
      expect(res.meta.right.badge).toMatch(/New York/i)
      expect(res.meta.right.badge).toMatch(/,/)
    })

    it('stores last result via convert side effect (getLastResult reflects it)', async () => {
      const { core, handlers } = createCore()
      register(core)
      await handlers.convert({ time: '12pm', from: 'utc', to: 'tokyo' })
      const last = (await handlers.getLastResult(undefined)) as { convertedTime: string } | null
      expect(last).not.toBeNull()
      expect(last!.convertedTime).toBeTruthy()
    })

    it('supports timezone abbreviations as destination', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = (await handlers.convert({ time: '12pm', from: 'utc', to: 'jst' })) as {
        error?: string
        convertedTime: string
      }
      expect(res.error).toBeUndefined()
      expect(res.convertedTime).toMatch(/9:00\s*PM/i)
    })
  })

  describe('getLastResult / setLastResult handlers', () => {
    it('getLastResult returns null initially', async () => {
      const { core, handlers } = createCore()
      register(core)
      expect(await handlers.getLastResult(undefined)).toBeNull()
    })

    it('setLastResult stores data', async () => {
      const { core, handlers } = createCore()
      register(core)
      const data = { convertedTime: '9:00 PM', timezone: 'tokyo' }
      const res = await handlers.setLastResult(data)
      expect(res).toEqual({ ok: true })
      expect(await handlers.getLastResult(undefined)).toEqual(data)
    })

    it('lastResult is isolated between separate register() instances', async () => {
      const { core: coreA, handlers: handlersA } = createCore()
      const { core: coreB, handlers: handlersB } = createCore()
      register(coreA)
      register(coreB)

      await handlersA.setLastResult({ convertedTime: 'A result' })
      expect(await handlersB.getLastResult(undefined)).toBeNull()
    })
  })

  describe('e2e: realistic conversion flows', () => {
    it('eval discovers city → convert returns same time', async () => {
      const { core, handlers } = createCore()
      register(core)

      const evalRes = (await handlers.eval({ text: '12pm in tokyo' })) as {
        items: Array<{ id: string }>
      }
      expect(evalRes.items[0].id).toBe('time-calc-result')

      const convertRes = (await handlers.convert({ time: '12pm', from: 'utc', to: 'tokyo' })) as {
        convertedTime: string
      }
      expect(convertRes.convertedTime).toMatch(/9:00\s*PM/i)
    })

    it('orchestrator flow: convert → setLastResult → getLastResult', async () => {
      const { core, handlers } = createCore()
      register(core)

      const result = (await handlers.convert({ time: '12pm', from: 'utc', to: 'tokyo' })) as {
        convertedTime: string
      }
      const last = (await handlers.getLastResult(undefined)) as { convertedTime: string }

      expect(last.convertedTime).toBe(result.convertedTime)
    })

    it('handles multiple sequential conversions', async () => {
      const { core, handlers } = createCore()
      register(core)

      const tokyo = (await handlers.convert({ time: '12pm', from: 'utc', to: 'tokyo' })) as {
        convertedTime: string
      }
      const nyc = (await handlers.convert({ time: '12pm', from: 'utc', to: 'new york' })) as {
        convertedTime: string
      }

      expect(tokyo.convertedTime).toMatch(/9:00\s*PM/i)
      expect(nyc.convertedTime).toMatch(/8:00\s*AM/i)
      expect(tokyo.convertedTime).not.toBe(nyc.convertedTime)
    })

    it('getLastResult after sequential converts returns most recent result', async () => {
      const { core, handlers } = createCore()
      register(core)

      await handlers.convert({ time: '12pm', from: 'utc', to: 'tokyo' })
      const second = (await handlers.convert({ time: '12pm', from: 'utc', to: 'new york' })) as {
        convertedTime: string
        timezone: string
      }
      const last = (await handlers.getLastResult(undefined)) as {
        convertedTime: string
        timezone: string
      }

      expect(last.convertedTime).toBe(second.convertedTime)
      expect(last.timezone).toBe('new york')
    })
  })
})
