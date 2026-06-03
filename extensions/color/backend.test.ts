import { describe, it, expect, vi, beforeEach } from 'vitest'
import { type CoreContext, createMockCore } from '@nuxy/extension-sdk'
import { register } from './backend.ts'
import type { SavedColor } from './types.ts'

function makeColor(hex = '#ff0000'): SavedColor {
  return {
    id: '',
    hex,
    rgb: 'rgb(255, 0, 0)',
    hsl: 'hsl(0, 100%, 50%)',
    r: 255, g: 0, b: 0,
    h: 0, s: 100, l: 50,
    savedAt: new Date().toISOString(),
  }
}

async function flush(): Promise<void> {
  for (let i = 0; i < 10; i++) await Promise.resolve()
}

describe('color backend', () => {
  let core: CoreContext
  let handlers: Record<string, (payload?: unknown) => Promise<unknown>>

  beforeEach(() => {
    ;({ core, handlers } = createMockCore())
    register(core)
  })

  it('registers as a tool', () => {
    expect(core.registry.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.any(String) })
    )
  })

  describe('parseColor', () => {
    it('returns null for invalid input', async () => {
      const result = await handlers.parseColor({ input: 'not-a-color' })
      expect(result).toBeNull()
    })

    it('parses a hex color', async () => {
      const result = (await handlers.parseColor({ input: '#ff0000' })) as SavedColor
      expect(result).not.toBeNull()
      expect(result.hex).toBe('#ff0000')
      expect(result.r).toBe(255)
      expect(result.g).toBe(0)
      expect(result.b).toBe(0)
    })

    it('parses a shorthand hex color', async () => {
      const result = (await handlers.parseColor({ input: '#f00' })) as SavedColor
      expect(result).not.toBeNull()
      expect(result.hex).toBe('#ff0000')
    })

    it('parses an rgb() color', async () => {
      const result = (await handlers.parseColor({ input: 'rgb(255, 0, 0)' })) as SavedColor
      expect(result).not.toBeNull()
      expect(result.hex).toBe('#ff0000')
    })

    it('parses an hsl() color', async () => {
      const result = (await handlers.parseColor({ input: 'hsl(0, 100%, 50%)' })) as SavedColor
      expect(result).not.toBeNull()
      expect(result.h).toBe(0)
      expect(result.s).toBe(100)
      expect(result.l).toBe(50)
    })

    it('parses an rgba() color (ignoring alpha)', async () => {
      const result = (await handlers.parseColor({ input: 'rgba(0, 128, 255, 0.5)' })) as SavedColor
      expect(result).not.toBeNull()
      expect(result.r).toBe(0)
      expect(result.g).toBe(128)
      expect(result.b).toBe(255)
    })
  })

  describe('getHistory', () => {
    it('returns empty array before init when no storage', async () => {
      const result = await handlers.getHistory()
      expect(result).toEqual([])
    })

    it('returns stored items after init resolves', async () => {
      const stored = [{ ...makeColor(), id: 'a1' }]
      ;({ core, handlers } = createMockCore({
        storage: { read: vi.fn().mockResolvedValue(stored) },
      }))
      register(core)
      await flush()
      const result = await handlers.getHistory()
      expect(result).toEqual(stored)
    })
  })

  describe('saveColor', () => {
    it('adds a new color and returns updated list', async () => {
      const color = makeColor()
      const result = (await handlers.saveColor({ color })) as SavedColor[]
      expect(result).toHaveLength(1)
      expect(result[0].hex).toBe('#ff0000')
      expect(result[0].id).not.toBe('')
    })

    it('deduplicates by hex — saving same hex twice results in 1 item', async () => {
      const color = makeColor('#00ff00')
      await handlers.saveColor({ color })
      await handlers.saveColor({ color })
      const result = (await handlers.getHistory()) as SavedColor[]
      expect(result).toHaveLength(1)
    })

    it('prepends newest color to the front', async () => {
      await handlers.saveColor({ color: makeColor('#ff0000') })
      await handlers.saveColor({ color: makeColor('#0000ff') })
      const result = (await handlers.getHistory()) as SavedColor[]
      expect(result[0].hex).toBe('#0000ff')
    })
  })

  describe('deleteColor', () => {
    it('removes the item by id', async () => {
      const color = makeColor()
      const saved = (await handlers.saveColor({ color })) as SavedColor[]
      const id = saved[0].id
      const result = (await handlers.deleteColor({ id })) as SavedColor[]
      expect(result).toHaveLength(0)
    })

    it('ignores unknown ids gracefully', async () => {
      await handlers.saveColor({ color: makeColor() })
      const result = (await handlers.deleteColor({ id: 'nonexistent' })) as SavedColor[]
      expect(result).toHaveLength(1)
    })
  })

  describe('copyColor', () => {
    it('writes text to clipboard', async () => {
      await handlers.copyColor({ text: '#ff0000' })
      expect(core.clipboard.writeText).toHaveBeenCalledWith('#ff0000')
    })
  })

  describe('getCopyFormat', () => {
    it('returns hex by default', async () => {
      const result = await handlers.getCopyFormat()
      expect(result).toBe('hex')
    })

    it('returns saved setting when set', async () => {
      ;({ core, handlers } = createMockCore({
        settings: { read: vi.fn().mockResolvedValue('rgb') },
      }))
      register(core)
      const result = await handlers.getCopyFormat()
      expect(result).toBe('rgb')
    })
  })
})
