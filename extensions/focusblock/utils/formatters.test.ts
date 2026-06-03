import { describe, it, expect } from 'vitest'
import { parseQuery, formatMs, formatDuration, formatDate } from './formatters.ts'

describe('parseQuery', () => {
  it('returns defaultDuration and empty label for empty string', () => {
    expect(parseQuery('', 25)).toEqual({ duration: 25, label: '' })
  })

  it('returns defaultDuration and empty label for whitespace-only string', () => {
    expect(parseQuery('   ', 25)).toEqual({ duration: 25, label: '' })
  })

  it('parses a numeric-only query as duration with empty label', () => {
    expect(parseQuery('45', 25)).toEqual({ duration: 45, label: '' })
  })

  it('parses numeric prefix as duration and the rest as label', () => {
    expect(parseQuery('30 Deep Work', 25)).toEqual({ duration: 30, label: 'Deep Work' })
  })

  it('treats a non-numeric query as a label with default duration', () => {
    expect(parseQuery('Reading', 25)).toEqual({ duration: 25, label: 'Reading' })
  })

  it('ignores numeric values out of range (> 480)', () => {
    expect(parseQuery('500', 25)).toEqual({ duration: 25, label: '500' })
  })

  it('ignores zero as a duration', () => {
    expect(parseQuery('0 test', 25)).toEqual({ duration: 25, label: '0 test' })
  })

  it('uses the provided defaultDuration', () => {
    expect(parseQuery('', 50)).toEqual({ duration: 50, label: '' })
  })
})

describe('formatMs', () => {
  it('formats zero milliseconds', () => {
    expect(formatMs(0)).toBe('00:00')
  })

  it('formats exactly one minute', () => {
    expect(formatMs(60000)).toBe('01:00')
  })

  it('formats with seconds', () => {
    expect(formatMs(90000)).toBe('01:30')
  })

  it('pads single-digit minutes and seconds', () => {
    expect(formatMs(65000)).toBe('01:05')
  })

  it('rounds up partial seconds (ceiling)', () => {
    expect(formatMs(500)).toBe('00:01')
  })
})

describe('formatDuration', () => {
  it('formats one minute', () => {
    expect(formatDuration(60000)).toBe('1m')
  })

  it('formats 25 minutes', () => {
    expect(formatDuration(1500000)).toBe('25m')
  })

  it('rounds to nearest minute', () => {
    expect(formatDuration(90000)).toBe('2m')
  })
})

describe('formatDate', () => {
  it('returns a non-empty string for a valid timestamp', () => {
    const result = formatDate(new Date('2024-01-15T10:30:00').getTime())
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})
