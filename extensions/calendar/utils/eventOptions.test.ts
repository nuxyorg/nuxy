import { describe, it, expect } from 'vitest'
import {
  TIME_OPTIONS,
  REMINDER_OPTIONS,
  getOptionLabel,
  getInitialFocusIndex,
} from './eventOptions.ts'

describe('TIME_OPTIONS', () => {
  it('starts at 8 AM', () => {
    expect(TIME_OPTIONS[0].value).toBe('8')
    expect(TIME_OPTIONS[0].label).toBe('8:00 AM')
  })

  it('ends at 7 PM', () => {
    const last = TIME_OPTIONS[TIME_OPTIONS.length - 1]
    expect(last.value).toBe('19')
    expect(last.label).toBe('7:00 PM')
  })

  it('all values are unique', () => {
    const values = TIME_OPTIONS.map((o) => o.value)
    expect(new Set(values).size).toBe(values.length)
  })
})

describe('REMINDER_OPTIONS', () => {
  it('first option is "No reminder" with value "0"', () => {
    expect(REMINDER_OPTIONS[0].value).toBe('0')
    expect(REMINDER_OPTIONS[0].label).toBe('No reminder')
  })

  it('includes 1 day before', () => {
    const oneDayBefore = REMINDER_OPTIONS.find((o) => o.value === '1440')
    expect(oneDayBefore?.label).toBe('1 day before')
  })
})

describe('getOptionLabel', () => {
  it('returns the matching label', () => {
    expect(getOptionLabel(TIME_OPTIONS, '10')).toBe('10:00 AM')
  })

  it('returns "—" when value is not found', () => {
    expect(getOptionLabel(TIME_OPTIONS, '99')).toBe('—')
  })

  it('returns "—" for empty value', () => {
    expect(getOptionLabel(REMINDER_OPTIONS, '')).toBe('—')
  })
})

describe('getInitialFocusIndex', () => {
  it('returns the correct index when value is found', () => {
    // '10' is at index 2 in TIME_OPTIONS
    expect(getInitialFocusIndex(TIME_OPTIONS, '10')).toBe(2)
  })

  it('returns 0 when value is not found', () => {
    expect(getInitialFocusIndex(TIME_OPTIONS, 'unknown')).toBe(0)
  })

  it('returns 0 for the first option', () => {
    expect(getInitialFocusIndex(REMINDER_OPTIONS, '0')).toBe(0)
  })
})
