import { describe, it, expect } from 'vitest'
import { parseJsonArray, parseNum } from './parse.ts'

describe('parseJsonArray', () => {
  it('parses a valid JSON array', () => {
    expect(parseJsonArray<number>('[1,2,3]')).toEqual([1, 2, 3])
  })

  it('returns [] for null input', () => {
    expect(parseJsonArray(null)).toEqual([])
  })

  it('returns [] for malformed JSON', () => {
    expect(parseJsonArray('{not json')).toEqual([])
  })

  it('returns [] when JSON is valid but not an array', () => {
    expect(parseJsonArray('{"a":1}')).toEqual([])
  })
})

describe('parseNum', () => {
  it('parses a numeric string', () => {
    expect(parseNum('42')).toBe(42)
  })

  it('returns the fallback for null', () => {
    expect(parseNum(null, 5)).toBe(5)
  })

  it('returns the fallback for an empty string', () => {
    expect(parseNum('', 5)).toBe(5)
  })

  it('returns the fallback for non-numeric input', () => {
    expect(parseNum('abc', 5)).toBe(5)
  })

  it('returns undefined when no fallback is given and input is invalid', () => {
    expect(parseNum('abc')).toBeUndefined()
  })
})
