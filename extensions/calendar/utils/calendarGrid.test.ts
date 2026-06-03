import { describe, it, expect } from 'vitest'
import { buildGrid, buildDayAbbr, getDaysInMonth, shiftDays, GridCell } from './calendarGrid.ts'

describe('getDaysInMonth', () => {
  it('returns 31 for January', () => {
    expect(getDaysInMonth(2025, 0)).toBe(31)
  })

  it('returns 28 for February in a non-leap year', () => {
    expect(getDaysInMonth(2025, 1)).toBe(28)
  })

  it('returns 29 for February in a leap year', () => {
    expect(getDaysInMonth(2024, 1)).toBe(29)
  })

  it('returns 30 for April', () => {
    expect(getDaysInMonth(2025, 3)).toBe(30)
  })
})

describe('buildGrid', () => {
  it('always returns exactly 42 cells', () => {
    for (let month = 0; month < 12; month++) {
      expect(buildGrid(2025, month).length).toBe(42)
    }
  })

  it('all cells with monthOffset 0 are in ascending order', () => {
    const grid = buildGrid(2025, 0)
    const current = grid.filter((c) => c.monthOffset === 0)
    for (let i = 1; i < current.length; i++) {
      expect(current[i].day).toBe(current[i - 1].day + 1)
    }
  })

  it('current-month cells span exactly the days in the month', () => {
    const grid = buildGrid(2025, 0)
    const current = grid.filter((c) => c.monthOffset === 0)
    expect(current.length).toBe(31)
    expect(current[0].day).toBe(1)
    expect(current[current.length - 1].day).toBe(31)
  })

  it('leading cells have monthOffset -1 and descending prev-month days', () => {
    // 2025-01-01 is Wednesday → with weekStart=1 (Mon), offset = (3-1+7)%7 = 2 leading cells
    const grid = buildGrid(2025, 0, 1)
    const leading = grid.filter((c) => c.monthOffset === -1)
    expect(leading.length).toBe(2)
    // prev month (Dec 2024) ends on 31, so leading days = [30, 31]
    expect(leading[0].day).toBe(30)
    expect(leading[1].day).toBe(31)
  })

  it('trailing cells have monthOffset 1 starting at 1', () => {
    const grid = buildGrid(2025, 0, 1)
    const trailing = grid.filter((c) => c.monthOffset === 1)
    expect(trailing[0].day).toBe(1)
  })

  it('no leading overflow cells when month starts on weekStart day', () => {
    // 2024-04-01 is a Monday → weekStart=1 → 0 leading cells
    const grid = buildGrid(2024, 3, 1)
    const leading = grid.filter((c) => c.monthOffset === -1)
    expect(leading.length).toBe(0)
  })

  it('respects weekStart=0 (Sunday-first grid)', () => {
    // 2025-01-01 is Wednesday → with weekStart=0 (Sun), offset = (3-0+7)%7 = 3
    const grid = buildGrid(2025, 0, 0)
    const leading = grid.filter((c) => c.monthOffset === -1)
    expect(leading.length).toBe(3)
  })
})

describe('buildDayAbbr', () => {
  it('returns 7 abbreviated day names', () => {
    expect(buildDayAbbr(0).length).toBe(7)
    expect(buildDayAbbr(1).length).toBe(7)
  })

  it('starts with the correct day for weekStart=1 (Monday)', () => {
    expect(buildDayAbbr(1)[0]).toBe('Mo')
    expect(buildDayAbbr(1)[6]).toBe('Su')
  })

  it('starts with the correct day for weekStart=0 (Sunday)', () => {
    expect(buildDayAbbr(0)[0]).toBe('Su')
    expect(buildDayAbbr(0)[6]).toBe('Sa')
  })
})

describe('shiftDays', () => {
  it('moves forward by 1 day', () => {
    expect(shiftDays(2025, 0, 15, 1)).toEqual({ year: 2025, month: 0, day: 16 })
  })

  it('moves backward by 1 day', () => {
    expect(shiftDays(2025, 0, 15, -1)).toEqual({ year: 2025, month: 0, day: 14 })
  })

  it('wraps forward into the next month', () => {
    expect(shiftDays(2025, 0, 31, 1)).toEqual({ year: 2025, month: 1, day: 1 })
  })

  it('wraps backward into the previous month', () => {
    expect(shiftDays(2025, 1, 1, -1)).toEqual({ year: 2025, month: 0, day: 31 })
  })

  it('wraps forward into the next year', () => {
    expect(shiftDays(2025, 11, 31, 1)).toEqual({ year: 2026, month: 0, day: 1 })
  })

  it('moves by a full week (7 days)', () => {
    expect(shiftDays(2025, 0, 25, 7)).toEqual({ year: 2025, month: 1, day: 1 })
  })

  it('handles zero delta', () => {
    expect(shiftDays(2025, 3, 15, 0)).toEqual({ year: 2025, month: 3, day: 15 })
  })
})
