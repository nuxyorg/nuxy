import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('child_process', () => ({
  execFile: vi.fn((_cmd, _args, cb) => cb(null)),
}))

import { register } from './backend.js'

function createCore(storedFavorites = null) {
  const handlers = {}
  const core = {
    registry: { registerTool: vi.fn() },
    ipc: {
      handle: (ch, fn) => {
        handlers[ch] = fn
      },
    },
    storage: {
      read: vi.fn().mockResolvedValue(storedFavorites),
      write: vi.fn().mockResolvedValue(undefined),
    },
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
    logger: { info: vi.fn(), error: vi.fn() },
  }
  return { core, handlers }
}

async function flush() {
  for (let i = 0; i < 4; i++) await Promise.resolve()
}

describe('emoji-picker backend', () => {
  it('registers as a tool', () => {
    const { core } = createCore()
    register(core)
    expect(core.registry.registerTool).toHaveBeenCalledWith({ name: 'emoji-picker' })
  })

  describe('getFavorites', () => {
    it('returns empty array initially', async () => {
      const { handlers } = createCore()
      register({
        registry: { registerTool: vi.fn() },
        ipc: {
          handle: (ch, fn) => {
            handlers[ch] = fn
          },
        },
        storage: { read: vi.fn().mockResolvedValue(null) },
        clipboard: { writeText: vi.fn() },
        logger: { info: vi.fn() },
      })
      expect(await handlers.getFavorites()).toEqual([])
    })

    it('loads favorites from storage after init', async () => {
      const stored = ['😀', '🎉', '❤️']
      const { core, handlers } = createCore(stored)
      register(core)
      await flush()
      expect(await handlers.getFavorites()).toEqual(stored)
    })

    it('ignores non-array storage data', async () => {
      const { core, handlers } = createCore({ notArray: true })
      register(core)
      await flush()
      expect(await handlers.getFavorites()).toEqual([])
    })

    it('returns the same list as toggleFavorite returned', async () => {
      const { core, handlers } = createCore()
      register(core)
      const toggleResult = await handlers.toggleFavorite('😀')
      const getResult = await handlers.getFavorites()
      expect(getResult).toEqual(toggleResult)
    })
  })

  describe('toggleFavorite', () => {
    it('adds an emoji to favorites', async () => {
      const { core, handlers } = createCore()
      register(core)
      const result = await handlers.toggleFavorite('😀')
      expect(result).toContain('😀')
    })

    it('removes an emoji that is already a favorite', async () => {
      const { core, handlers } = createCore(['😀', '🎉'])
      register(core)
      await flush()
      const result = await handlers.toggleFavorite('😀')
      expect(result).not.toContain('😀')
      expect(result).toContain('🎉')
    })

    it('adds emoji at the front of the list', async () => {
      const { core, handlers } = createCore(['🎉'])
      register(core)
      await flush()
      const result = await handlers.toggleFavorite('😀')
      expect(result[0]).toBe('😀')
    })

    it('caps favorites at 60 items', async () => {
      const { core, handlers } = createCore()
      register(core)
      // Add 65 unique emojis
      for (let i = 0; i < 65; i++) {
        await handlers.toggleFavorite(`emoji-${i}`)
      }
      const result = await handlers.getFavorites()
      expect(result).toHaveLength(60)
    })

    it('drops the oldest emoji when the 61st is added', async () => {
      // Pre-load 60 emojis in order [emoji-0, emoji-1, ..., emoji-59]
      // emoji-0 is at position 0 (most recently added), emoji-59 is the oldest (last position)
      const initial = Array.from({ length: 60 }, (_, i) => `emoji-${i}`)
      const { core, handlers } = createCore(initial)
      register(core)
      await flush()

      // Prepend emoji-new: [emoji-new, emoji-0, ..., emoji-59].slice(0, 60)
      // => emoji-59 (the oldest, at the tail) is dropped
      const result = await handlers.toggleFavorite('emoji-new')
      expect(result).toHaveLength(60)
      expect(result[0]).toBe('emoji-new')
      expect(result).not.toContain('emoji-59')
      // emoji-0 through emoji-58 are preserved
      expect(result).toContain('emoji-0')
      expect(result).toContain('emoji-58')
    })

    it('persists favorites to storage after each toggle', async () => {
      const { core, handlers } = createCore()
      register(core)
      await handlers.toggleFavorite('😀')
      expect(core.storage.write).toHaveBeenCalledWith('favorites.json', ['😀'])
    })

    it('returns the updated favorites list', async () => {
      const { core, handlers } = createCore()
      register(core)
      const result = await handlers.toggleFavorite('😀')
      expect(Array.isArray(result)).toBe(true)
    })

    it('still returns updated favorites even when storage.write fails', async () => {
      const { core, handlers } = createCore()
      core.storage.write.mockRejectedValue(new Error('disk full'))
      register(core)
      // Should not throw; result is the updated favorites
      const result = await handlers.toggleFavorite('😀')
      expect(result).toContain('😀')
    })
  })

  describe('copy', () => {
    it('writes emoji text to clipboard', async () => {
      const { core, handlers } = createCore()
      register(core)
      await handlers.copy('😀')
      expect(core.clipboard.writeText).toHaveBeenCalledWith('😀')
    })

    it('returns { ok: true }', async () => {
      const { core, handlers } = createCore()
      register(core)
      const result = await handlers.copy('🎉')
      expect(result).toEqual({ ok: true })
    })

    it('also attempts to write to the selection (primary) clipboard', async () => {
      const { core, handlers } = createCore()
      register(core)
      await handlers.copy('😀')
      expect(core.clipboard.writeText).toHaveBeenCalledWith('😀', 'selection')
    })

    it('still returns { ok: true } when the selection clipboard write fails', async () => {
      const { core, handlers } = createCore()
      // Primary write succeeds, secondary write (selection) throws
      core.clipboard.writeText
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('selection clipboard unavailable'))
      register(core)
      const result = await handlers.copy('😀')
      expect(result).toEqual({ ok: true })
    })

    it('copies an empty string by calling writeText with an empty string', async () => {
      const { core, handlers } = createCore()
      register(core)
      await handlers.copy('')
      expect(core.clipboard.writeText).toHaveBeenCalledWith('')
    })
  })

  describe('paste', () => {
    beforeEach(async () => {
      const { execFile } = await import('child_process')
      execFile.mockReset()
      execFile.mockImplementation((_cmd, _args, cb) => cb(null))
    })

    it('returns { ok: true }', async () => {
      const { core, handlers } = createCore()
      register(core)
      const result = await handlers.paste()
      expect(result).toEqual({ ok: true })
    })

    it('calls xdotool with Shift+Insert', async () => {
      const { execFile } = await import('child_process')
      const { core, handlers } = createCore()
      register(core)
      await handlers.paste()
      expect(execFile).toHaveBeenCalledWith(
        'xdotool',
        expect.arrayContaining(['Shift+Insert']),
        expect.any(Function)
      )
    })

    it('falls back to ctrl+v if Shift+Insert fails', async () => {
      const { execFile } = await import('child_process')
      execFile.mockImplementationOnce((_cmd, _args, cb) => cb(new Error('xdotool failed')))
      execFile.mockImplementationOnce((_cmd, _args, cb) => cb(null))

      const { core, handlers } = createCore()
      register(core)
      const result = await handlers.paste()

      expect(result).toEqual({ ok: true })
      // First call: Shift+Insert (fails), second call: ctrl+v (fallback)
      expect(execFile).toHaveBeenNthCalledWith(
        2,
        'xdotool',
        expect.arrayContaining(['ctrl+v']),
        expect.any(Function)
      )
    })

    it('does not call ctrl+v when Shift+Insert succeeds', async () => {
      const { execFile } = await import('child_process')
      const { core, handlers } = createCore()
      register(core)
      await handlers.paste()
      // Only one call: Shift+Insert succeeded, no fallback
      expect(execFile).toHaveBeenCalledTimes(1)
      expect(execFile).not.toHaveBeenCalledWith(
        'xdotool',
        expect.arrayContaining(['ctrl+v']),
        expect.any(Function)
      )
    })
  })

  // Integration: realistic usage flow
  describe('e2e: favorites lifecycle', () => {
    it('add, check, remove, check again', async () => {
      const { core, handlers } = createCore()
      register(core)

      // Add emoji
      await handlers.toggleFavorite('😀')
      expect(await handlers.getFavorites()).toContain('😀')

      // Add another
      await handlers.toggleFavorite('🎉')
      expect(await handlers.getFavorites()).toEqual(['🎉', '😀'])

      // Remove first
      await handlers.toggleFavorite('😀')
      const final = await handlers.getFavorites()
      expect(final).not.toContain('😀')
      expect(final).toContain('🎉')
    })

    it('toggle same emoji twice results in empty list', async () => {
      const { core, handlers } = createCore()
      register(core)
      await handlers.toggleFavorite('😀')
      await handlers.toggleFavorite('😀')
      expect(await handlers.getFavorites()).toEqual([])
    })

    it('copy then check clipboard', async () => {
      const { core, handlers } = createCore(['😀', '🎉', '❤️'])
      register(core)
      await flush()

      await handlers.copy('🎉')
      expect(core.clipboard.writeText).toHaveBeenCalledWith('🎉')
    })
  })
})
