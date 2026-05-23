import { describe, it, expect, vi, beforeEach } from 'vitest'
import { register } from './backend.js'

function createCore(storageData = null) {
  const handlers = {}
  const core = {
    ipc: { handle: (ch, fn) => { handlers[ch] = fn } },
    storage: {
      read: vi.fn().mockResolvedValue(storageData),
      write: vi.fn().mockResolvedValue(undefined),
    },
    logger: { info: vi.fn(), error: vi.fn() },
  }
  return { core, handlers }
}

// Drain async init promise chain
async function flush() {
  for (let i = 0; i < 6; i++) await Promise.resolve()
}

describe('shell backend', () => {
  describe('getRecentTools', () => {
    it('returns empty array before storage loads', async () => {
      const { core, handlers } = createCore()
      register(core)
      // Before init resolves, recentTools is []
      expect(await handlers.getRecentTools()).toEqual([])
    })

    it('loads previously stored tools after init', async () => {
      const stored = ['com.nuxy.settings', 'com.nuxy.calc']
      const { core, handlers } = createCore(stored)
      register(core)
      await flush()
      expect(await handlers.getRecentTools()).toEqual(stored)
    })

    it('ignores non-array storage values', async () => {
      const { core, handlers } = createCore({ notAnArray: true })
      register(core)
      await flush()
      expect(await handlers.getRecentTools()).toEqual([])
    })

    it('returns list in most-recent-first order', async () => {
      const { core, handlers } = createCore()
      register(core)
      await handlers.recordToolUsed('com.nuxy.calc')
      await handlers.recordToolUsed('com.nuxy.settings')
      await handlers.recordToolUsed('com.nuxy.shell')
      const result = await handlers.getRecentTools()
      expect(result).toEqual(['com.nuxy.shell', 'com.nuxy.settings', 'com.nuxy.calc'])
    })
  })

  describe('recordToolUsed', () => {
    it('adds a tool id to the history', async () => {
      const { core, handlers } = createCore()
      register(core)
      const result = await handlers.recordToolUsed('com.nuxy.calc')
      expect(result).toContain('com.nuxy.calc')
    })

    it('returns the updated list', async () => {
      const { core, handlers } = createCore()
      register(core)
      await handlers.recordToolUsed('com.nuxy.calc')
      const result = await handlers.recordToolUsed('com.nuxy.settings')
      expect(result[0]).toBe('com.nuxy.settings')
      expect(result[1]).toBe('com.nuxy.calc')
    })

    it('moves duplicate to the front instead of adding again', async () => {
      const { core, handlers } = createCore()
      register(core)
      await handlers.recordToolUsed('com.nuxy.calc')
      await handlers.recordToolUsed('com.nuxy.settings')
      const result = await handlers.recordToolUsed('com.nuxy.calc')
      expect(result[0]).toBe('com.nuxy.calc')
      expect(result.filter((id) => id === 'com.nuxy.calc')).toHaveLength(1)
    })

    it('caps history at 10 entries', async () => {
      const { core, handlers } = createCore()
      register(core)
      for (let i = 0; i < 15; i++) {
        await handlers.recordToolUsed(`tool-${i}`)
      }
      const result = await handlers.getRecentTools()
      expect(result).toHaveLength(10)
    })

    // Merged from the two separate "ignores non-string" tests
    it.each([null, undefined, 42, {}, [], true])('ignores non-string tool id: %s', async (badId) => {
      const { core, handlers } = createCore()
      register(core)
      const result = await handlers.recordToolUsed(badId)
      expect(result).toEqual([])
    })

    it('accepts an empty string (it is a string)', async () => {
      const { core, handlers } = createCore()
      register(core)
      const result = await handlers.recordToolUsed('')
      expect(result).toContain('')
      expect(result).toHaveLength(1)
    })

    it('accepts a very long string', async () => {
      const { core, handlers } = createCore()
      register(core)
      const longId = 'com.nuxy.' + 'x'.repeat(500)
      const result = await handlers.recordToolUsed(longId)
      expect(result).toContain(longId)
    })

    it('persists the updated list to storage', async () => {
      const { core, handlers } = createCore()
      register(core)
      await handlers.recordToolUsed('com.nuxy.calc')
      expect(core.storage.write).toHaveBeenCalledWith('tool-history.json', ['com.nuxy.calc'])
    })
  })

  // Integration: simulate realistic usage flow
  describe('e2e: tool history lifecycle', () => {
    it('loads existing history, records new usage, deduplicates', async () => {
      const stored = ['com.nuxy.settings', 'com.nuxy.shell']
      const { core, handlers } = createCore(stored)
      register(core)
      await flush()

      // Use settings (already in history) → should move to front
      await handlers.recordToolUsed('com.nuxy.settings')
      // Use a new tool
      await handlers.recordToolUsed('com.nuxy.calc')

      const result = await handlers.getRecentTools()
      expect(result[0]).toBe('com.nuxy.calc')
      expect(result[1]).toBe('com.nuxy.settings')
      // shell is still there, pushed back
      expect(result).toContain('com.nuxy.shell')
      // No duplicates
      expect(new Set(result).size).toBe(result.length)
    })

    it('deduplicates correctly against tools loaded from storage', async () => {
      const stored = ['com.nuxy.settings', 'com.nuxy.shell', 'com.nuxy.calc']
      const { core, handlers } = createCore(stored)
      register(core)
      await flush()

      // Record a tool that was already in stored history
      const result = await handlers.recordToolUsed('com.nuxy.shell')
      expect(result[0]).toBe('com.nuxy.shell')
      expect(result.filter((id) => id === 'com.nuxy.shell')).toHaveLength(1)
      expect(result).toContain('com.nuxy.settings')
      expect(result).toContain('com.nuxy.calc')
    })

    it('survives storage write errors gracefully and still returns updated list', async () => {
      const { core, handlers } = createCore()
      core.storage.write = vi.fn().mockRejectedValue(new Error('disk full'))
      register(core)

      // Should not throw, and the in-memory list should still reflect the update
      const result = await handlers.recordToolUsed('com.nuxy.calc')
      expect(result).toContain('com.nuxy.calc')
      expect(result[0]).toBe('com.nuxy.calc')
    })
  })
})
