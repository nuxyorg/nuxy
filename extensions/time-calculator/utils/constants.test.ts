import { describe, it, expect } from 'vitest'
import { EXAMPLE_QUERIES } from './constants.ts'

describe('EXAMPLE_QUERIES', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(EXAMPLE_QUERIES)).toBe(true)
    expect(EXAMPLE_QUERIES.length).toBeGreaterThan(0)
  })

  it('contains only non-empty strings', () => {
    for (const q of EXAMPLE_QUERIES) {
      expect(typeof q).toBe('string')
      expect(q.trim().length).toBeGreaterThan(0)
    }
  })
})
