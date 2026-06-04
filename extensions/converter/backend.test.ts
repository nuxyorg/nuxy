import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockCore } from '@nuxy/extension-sdk'
import { register } from './backend.ts'
import type { ConversionResult } from './types.ts'

describe('converter backend', () => {
  it('registers a tool and provider with name converter', () => {
    const { core } = createMockCore({
      i18n: { locale: 'en', dir: 'ltr', t: vi.fn((key: string) => key) },
    })
    register(core)
    expect(core.registry.registerTool).toHaveBeenCalledWith({ name: 'converter' })
    expect(core.registry.registerProvider).toHaveBeenCalledWith({ name: 'converter' })
  })

  describe('convert handler', () => {
    let core: ReturnType<typeof createMockCore>['core']
    let handlers: ReturnType<typeof createMockCore>['handlers']

    beforeEach(() => {
      ;({ core, handlers } = createMockCore({
        i18n: { locale: 'en', dir: 'ltr', t: vi.fn((key: string) => key) },
      }))
      register(core)
    })

    it('returns [] for empty query', async () => {
      const result = await handlers['convert']({ query: '' })
      expect(result).toEqual([])
    })

    it('returns [] for unparseable query', async () => {
      const result = await handlers['convert']({ query: 'abc xyz' })
      expect(result).toEqual([])
    })

    it('returns multiple results for "100 km" (no target unit)', async () => {
      const result = (await handlers['convert']({ query: '100 km' })) as ConversionResult[]
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      // Should include km→mi conversion
      const toMi = result.find((r) => r.toUnit === 'mi')
      expect(toMi).toBeDefined()
      // Should include km→m conversion
      const toM = result.find((r) => r.toUnit === 'm')
      expect(toM).toBeDefined()
      // All results should be from km
      result.forEach((r) => {
        expect(r.fromUnit).toBe('km')
        expect(r.fromValue).toBe(100)
      })
    })

    it('returns single result for "100 km to mi"', async () => {
      const result = (await handlers['convert']({ query: '100 km to mi' })) as ConversionResult[]
      expect(result).toHaveLength(1)
      expect(result[0].fromUnit).toBe('km')
      expect(result[0].toUnit).toBe('mi')
      expect(result[0].toValue).toBeCloseTo(62.137, 2)
    })

    it('converts 32 F to C (≈ 0)', async () => {
      const result = (await handlers['convert']({ query: '32 F to C' })) as ConversionResult[]
      expect(result).toHaveLength(1)
      expect(result[0].toValue).toBeCloseTo(0, 4)
    })

    it('converts 100 C to F (≈ 212)', async () => {
      const result = (await handlers['convert']({ query: '100 C to F' })) as ConversionResult[]
      expect(result).toHaveLength(1)
      expect(result[0].toValue).toBeCloseTo(212, 4)
    })

    it('converts 0 K to C (≈ -273.15)', async () => {
      const result = (await handlers['convert']({ query: '0 K to C' })) as ConversionResult[]
      expect(result).toHaveLength(1)
      expect(result[0].toValue).toBeCloseTo(-273.15, 2)
    })

    it('filters to metric units only when unitSystem is "metric"', async () => {
      ;(core.settings.read as ReturnType<typeof vi.fn>).mockImplementation(async (key: string) => {
        if (key === 'unitSystem') return 'metric'
        if (key === 'precision') return '2'
        return null
      })

      const result = (await handlers['convert']({ query: '100 km' })) as ConversionResult[]
      expect(result.length).toBeGreaterThan(0)
      // No imperial units should appear
      const imperialUnits = ['mi', 'ft', 'in', 'yd']
      result.forEach((r) => {
        expect(imperialUnits).not.toContain(r.toUnit)
      })
    })

    it('returns integer results when precision is "0"', async () => {
      ;(core.settings.read as ReturnType<typeof vi.fn>).mockImplementation(async (key: string) => {
        if (key === 'unitSystem') return 'both'
        if (key === 'precision') return '0'
        return null
      })

      const result = (await handlers['convert']({ query: '100 km to mi' })) as ConversionResult[]
      expect(result).toHaveLength(1)
      // With precision 0, formatted result should be an integer
      expect(result[0].formattedResult).toMatch(/^\d+ /)
    })

    it('parses European decimal format "1,5 km" as 1.5 km', async () => {
      const result = (await handlers['convert']({ query: '1,5 km to m' })) as ConversionResult[]
      expect(result).toHaveLength(1)
      expect(result[0].fromValue).toBe(1.5)
      expect(result[0].toValue).toBeCloseTo(1500, 2)
    })
  })

  describe('eval handler', () => {
    let handlers: ReturnType<typeof createMockCore>['handlers']

    beforeEach(() => {
      const mock = createMockCore({
        i18n: { locale: 'en', dir: 'ltr', t: vi.fn((key: string) => key) },
      })
      register(mock.core)
      handlers = mock.handlers
    })

    it('returns empty items for blank query', async () => {
      const res = await handlers['eval']({ text: '' })
      expect(res).toEqual({ items: [] })
    })

    it('returns empty items for unparseable query', async () => {
      const res = await handlers['eval']({ text: 'not a conversion' })
      expect(res).toEqual({ items: [] })
    })

    it('returns one result item for targeted conversion', async () => {
      const res = await handlers['eval']({ text: '100 km to mi' })
      expect(res.items).toHaveLength(1)
      expect(res.items[0]).toMatchObject({
        id: 'conv-km-mi',
        title: '100 km = 62.14 mi',
        subtitle: 'Unit Converter',
        value: '62.14 mi',
      })
    })

    it('returns multiple result items when no target unit', async () => {
      const res = await handlers['eval']({ text: '100 km' })
      expect(res.items.length).toBeGreaterThan(1)
      res.items.forEach((item: { subtitle: string }) => {
        expect(item.subtitle).toBe('Unit Converter')
      })
    })
  })

  describe('copyResult handler', () => {
    let core: ReturnType<typeof createMockCore>['core']
    let handlers: ReturnType<typeof createMockCore>['handlers']

    beforeEach(() => {
      ;({ core, handlers } = createMockCore({
        i18n: { locale: 'en', dir: 'ltr', t: vi.fn((key: string) => key) },
      }))
      register(core)
    })

    it('calls clipboard.writeText with the provided value', async () => {
      const result = await handlers['copyResult']({ value: '62.14 mi' })
      expect(core.clipboard.writeText).toHaveBeenCalledWith('62.14 mi')
      expect(result).toEqual({ copied: true })
    })
  })
})
