import { describe, it, expect } from 'vitest'
import { parseQuery, convert, getConversionsForCategory } from './units.ts'

describe('parseQuery', () => {
  it('parses "100 km" correctly', () => {
    const result = parseQuery('100 km')
    expect(result).toEqual({
      value: 100,
      fromUnit: 'km',
      toUnit: null,
      category: 'length',
    })
  })

  it('parses "32 F to C" correctly', () => {
    const result = parseQuery('32 F to C')
    expect(result).toEqual({
      value: 32,
      fromUnit: 'f',
      toUnit: 'c',
      category: 'temperature',
    })
  })

  it('returns null for "foo"', () => {
    const result = parseQuery('foo')
    expect(result).toBeNull()
  })

  it('returns null for empty string', () => {
    const result = parseQuery('')
    expect(result).toBeNull()
  })

  it('parses European decimal "1,5 km"', () => {
    const result = parseQuery('1,5 km')
    expect(result).not.toBeNull()
    expect(result!.value).toBe(1.5)
    expect(result!.fromUnit).toBe('km')
  })

  it('parses "100 km to mi"', () => {
    const result = parseQuery('100 km to mi')
    expect(result).not.toBeNull()
    expect(result!.value).toBe(100)
    expect(result!.fromUnit).toBe('km')
    expect(result!.toUnit).toBe('mi')
    expect(result!.category).toBe('length')
  })

  it('parses "5 kg" as weight', () => {
    const result = parseQuery('5 kg')
    expect(result).not.toBeNull()
    expect(result!.fromUnit).toBe('kg')
    expect(result!.category).toBe('weight')
  })

  it('returns null for unrecognised unit "abc xyz"', () => {
    const result = parseQuery('abc xyz')
    expect(result).toBeNull()
  })

  it('parses "0 K" for temperature', () => {
    const result = parseQuery('0 K')
    expect(result).not.toBeNull()
    expect(result!.fromUnit).toBe('k')
    expect(result!.category).toBe('temperature')
  })
})

describe('convert', () => {
  it('km → m: 1 km = 1000 m', () => {
    const result = convert(1, 'km', 'm', 'length', 4)
    expect(result.toValue).toBeCloseTo(1000, 5)
    expect(result.fromUnit).toBe('km')
    expect(result.toUnit).toBe('m')
  })

  it('m → km: round-trip 1000 m → 1 km', () => {
    const km = convert(1, 'km', 'm', 'length', 6)
    const back = convert(km.toValue, 'm', 'km', 'length', 6)
    expect(back.toValue).toBeCloseTo(1, 5)
  })

  it('temperature: 0 C → 32 F', () => {
    const result = convert(0, 'c', 'f', 'temperature', 4)
    expect(result.toValue).toBeCloseTo(32, 4)
  })

  it('temperature: 100 C → 212 F', () => {
    const result = convert(100, 'c', 'f', 'temperature', 4)
    expect(result.toValue).toBeCloseTo(212, 4)
  })

  it('temperature: 0 K → -273.15 C', () => {
    const result = convert(0, 'k', 'c', 'temperature', 4)
    expect(result.toValue).toBeCloseTo(-273.15, 2)
  })

  it('temperature: 32 F → 0 C', () => {
    const result = convert(32, 'f', 'c', 'temperature', 4)
    expect(result.toValue).toBeCloseTo(0, 4)
  })

  it('formats result with precision', () => {
    const result = convert(100, 'km', 'mi', 'length', 2)
    expect(result.formattedResult).toMatch(/^[\d.]+ mi$/)
    expect(result.toValue).toBeCloseTo(62.137, 2)
  })

  it('strips trailing zeros from formatted result', () => {
    const result = convert(1, 'km', 'm', 'length', 4)
    // 1 km = 1000 m exactly, should not have trailing decimals
    expect(result.formattedResult).toBe('1000 m')
  })

  it('weight: 1 kg = 1000 g', () => {
    const result = convert(1, 'kg', 'g', 'weight', 4)
    expect(result.toValue).toBeCloseTo(1000, 5)
  })

  it('weight: round-trip lb → g → lb', () => {
    const toG = convert(1, 'lb', 'g', 'weight', 6)
    const back = convert(toG.toValue, 'g', 'lb', 'weight', 6)
    expect(back.toValue).toBeCloseTo(1, 4)
  })

  it('throws for unknown fromUnit', () => {
    expect(() => convert(1, 'unknown', 'm', 'length', 2)).toThrow()
  })

  it('throws for unknown toUnit', () => {
    expect(() => convert(1, 'm', 'unknown', 'length', 2)).toThrow()
  })
})

describe('getConversionsForCategory', () => {
  it('returns all length units except identity (both systems)', () => {
    const results = getConversionsForCategory(1, 'km', 'length', 'both', 2)
    // Should NOT include km→km
    expect(results.find((r) => r.toUnit === 'km')).toBeUndefined()
    // Should include m, cm, mm, mi, ft, in, yd
    const toUnits = results.map((r) => r.toUnit)
    expect(toUnits).toContain('m')
    expect(toUnits).toContain('mi')
    expect(toUnits).toContain('ft')
  })

  it('filters to metric only', () => {
    const results = getConversionsForCategory(1, 'km', 'length', 'metric', 2)
    const toUnits = results.map((r) => r.toUnit)
    // Should NOT contain imperial units
    expect(toUnits).not.toContain('mi')
    expect(toUnits).not.toContain('ft')
    expect(toUnits).not.toContain('in')
    expect(toUnits).not.toContain('yd')
    // Should contain metric units
    expect(toUnits).toContain('m')
    expect(toUnits).toContain('cm')
  })

  it('filters to imperial only', () => {
    const results = getConversionsForCategory(1, 'm', 'length', 'imperial', 2)
    const toUnits = results.map((r) => r.toUnit)
    expect(toUnits).not.toContain('km')
    expect(toUnits).not.toContain('cm')
    expect(toUnits).toContain('mi')
    expect(toUnits).toContain('ft')
  })

  it('temperature: both systems includes all 3 units minus identity', () => {
    const results = getConversionsForCategory(0, 'c', 'temperature', 'both', 2)
    expect(results).toHaveLength(2)
    const toUnits = results.map((r) => r.toUnit)
    expect(toUnits).toContain('f')
    expect(toUnits).toContain('k')
  })

  it('data: 1 GB has correct byte count', () => {
    const results = getConversionsForCategory(1, 'gb', 'data', 'both', 0)
    const toBytes = results.find((r) => r.toUnit === 'b')
    expect(toBytes).toBeDefined()
    expect(toBytes!.toValue).toBe(1e9)
  })
})
