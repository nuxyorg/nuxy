import { describe, it, expect } from 'vitest'
import { CARD_STYLES } from './styles.ts'

describe('CARD_STYLES', () => {
  it('is a non-empty string', () => {
    expect(typeof CARD_STYLES).toBe('string')
    expect(CARD_STYLES.trim().length).toBeGreaterThan(0)
  })

  it('contains core class selectors', () => {
    expect(CARD_STYLES).toContain('.tc-card')
    expect(CARD_STYLES).toContain('.tc-panel')
    expect(CARD_STYLES).toContain('.tc-arrow')
    expect(CARD_STYLES).toContain('.tc-wrapper')
  })

  it('contains both left-panel modifier and time-large modifier', () => {
    expect(CARD_STYLES).toContain('.tc-panel--left')
    expect(CARD_STYLES).toContain('.tc-panel__time--large')
  })
})
