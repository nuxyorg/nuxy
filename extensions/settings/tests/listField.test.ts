import { describe, it, expect } from 'vitest'
import { parseListFieldValue } from '../utils/listField.ts'

describe('parseListFieldValue', () => {
  it('returns the array as-is when already an array of strings', () => {
    expect(parseListFieldValue(['/proc', '/dev'])).toEqual(['/proc', '/dev'])
  })

  it('migrates a legacy comma-separated string', () => {
    expect(parseListFieldValue('/proc,/dev, /sys ,')).toEqual(['/proc', '/dev', '/sys'])
  })

  it('returns an empty array for undefined', () => {
    expect(parseListFieldValue(undefined)).toEqual([])
  })

  it('returns an empty array for an empty string', () => {
    expect(parseListFieldValue('')).toEqual([])
  })

  it('filters out non-string entries from an array value', () => {
    expect(parseListFieldValue(['a', 1, null, 'b'])).toEqual(['a', 'b'])
  })
})
