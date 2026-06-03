import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { timeAgo } from './format.ts'

describe('timeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns empty string for empty input', () => {
    expect(timeAgo('')).toBe('')
  })

  it('returns "now" for timestamps less than 1 minute ago', () => {
    const thirtySecondsAgo = new Date('2024-06-15T11:59:30.000Z').toISOString()
    expect(timeAgo(thirtySecondsAgo)).toBe('now')
  })

  it('returns minutes for timestamps less than 1 hour ago', () => {
    const tenMinutesAgo = new Date('2024-06-15T11:50:00.000Z').toISOString()
    expect(timeAgo(tenMinutesAgo)).toBe('10m')
  })

  it('returns hours for timestamps less than 24 hours ago', () => {
    const threeHoursAgo = new Date('2024-06-15T09:00:00.000Z').toISOString()
    expect(timeAgo(threeHoursAgo)).toBe('3h')
  })

  it('returns a formatted date for timestamps older than 24 hours', () => {
    const twoDaysAgo = new Date('2024-06-13T12:00:00.000Z').toISOString()
    const result = timeAgo(twoDaysAgo)
    // Result is locale-dependent but should contain the day number
    expect(result).toMatch(/13/)
  })

  it('returns "1m" for exactly 1 minute ago', () => {
    const oneMinuteAgo = new Date('2024-06-15T11:59:00.000Z').toISOString()
    expect(timeAgo(oneMinuteAgo)).toBe('1m')
  })

  it('returns "1h" for exactly 1 hour ago', () => {
    const oneHourAgo = new Date('2024-06-15T11:00:00.000Z').toISOString()
    expect(timeAgo(oneHourAgo)).toBe('1h')
  })
})
