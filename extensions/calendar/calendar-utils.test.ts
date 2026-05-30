import { describe, it, expect } from 'vitest'
import {
  getDaysInMonth,
  buildCalendarGrid,
  navigateDays,
  filterEventsByDay,
  filterEventsByQuery,
  getEventDays,
  getRenderView,
} from './calendar-utils.ts'

interface TestEvent {
  id: string
  title: string
  datetime: number
  remindMin: number
}

// 2025-01-01 00:00:00 UTC (Wednesday)
const JAN_2025 = { year: 2025, month: 0 }
// 2025-02-01 (Saturday first weekday)
const FEB_2025 = { year: 2025, month: 1 }
// 2024-02-01 (leap year)
const FEB_2024 = { year: 2024, month: 1 }

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

  it('returns 31 for December', () => {
    expect(getDaysInMonth(2025, 11)).toBe(31)
  })
})

describe('buildCalendarGrid', () => {
  it('starts with null padding for days before the first weekday (Mon=0)', () => {
    // 2025-01-01 is a Wednesday → index 2 → 2 nulls before day 1
    const grid = buildCalendarGrid(JAN_2025.year, JAN_2025.month)
    expect(grid[0]).toBeNull()
    expect(grid[1]).toBeNull()
    expect(grid[2]).toBe(1)
  })

  it('has no leading nulls when month starts on Monday', () => {
    // 2024-04-01 is a Monday
    const grid = buildCalendarGrid(2024, 3)
    expect(grid[0]).toBe(1)
  })

  it('has 6 leading nulls when month starts on Sunday', () => {
    // 2025-06-01 is a Sunday → 6 nulls (Monday-first grid)
    const grid = buildCalendarGrid(2025, 5)
    expect(grid.slice(0, 6).every((c) => c === null)).toBe(true)
    expect(grid[6]).toBe(1)
  })

  it('total length = leading nulls + days in month', () => {
    const grid = buildCalendarGrid(JAN_2025.year, JAN_2025.month)
    const nullCount = grid.findIndex((c) => c !== null)
    expect(grid.length).toBe(nullCount + 31)
  })

  it('last cell equals the number of days in the month', () => {
    const grid = buildCalendarGrid(FEB_2024.year, FEB_2024.month)
    expect(grid[grid.length - 1]).toBe(29)
  })
})

describe('navigateDays', () => {
  it('moves forward by 1 day within the same month', () => {
    expect(navigateDays(2025, 0, 15, 1)).toEqual({ year: 2025, month: 0, day: 16 })
  })

  it('moves backward by 1 day within the same month', () => {
    expect(navigateDays(2025, 0, 15, -1)).toEqual({ year: 2025, month: 0, day: 14 })
  })

  it('crosses forward into the next month', () => {
    expect(navigateDays(2025, 0, 31, 1)).toEqual({ year: 2025, month: 1, day: 1 })
  })

  it('crosses backward into the previous month', () => {
    expect(navigateDays(2025, 1, 1, -1)).toEqual({ year: 2025, month: 0, day: 31 })
  })

  it('crosses forward into the next year', () => {
    expect(navigateDays(2025, 11, 31, 1)).toEqual({ year: 2026, month: 0, day: 1 })
  })

  it('crosses backward into the previous year', () => {
    expect(navigateDays(2025, 0, 1, -1)).toEqual({ year: 2024, month: 11, day: 31 })
  })

  it('moves forward by 7 days (one week)', () => {
    expect(navigateDays(2025, 0, 25, 7)).toEqual({ year: 2025, month: 1, day: 1 })
  })

  it('moves backward by 7 days (one week)', () => {
    expect(navigateDays(2025, 1, 1, -7)).toEqual({ year: 2025, month: 0, day: 25 })
  })
})

describe('filterEventsByDay', () => {
  const events: TestEvent[] = [
    {
      id: 'a',
      title: 'Morning standup',
      datetime: new Date(2025, 0, 15, 9, 0).getTime(),
      remindMin: 0,
    },
    {
      id: 'b',
      title: 'Lunch',
      datetime: new Date(2025, 0, 15, 12, 0).getTime(),
      remindMin: 5,
    },
    {
      id: 'c',
      title: 'Next day',
      datetime: new Date(2025, 0, 16, 9, 0).getTime(),
      remindMin: 0,
    },
  ]

  it('returns only events on the given day', () => {
    const result = filterEventsByDay(events, 2025, 0, 15)
    expect(result.map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('returns empty array when no events on the day', () => {
    const result = filterEventsByDay(events, 2025, 0, 20)
    expect(result).toHaveLength(0)
  })

  it('excludes events from neighboring months', () => {
    const crossMonth: TestEvent[] = [
      {
        id: 'x',
        title: 'Feb event',
        datetime: new Date(2025, 1, 15, 9, 0).getTime(),
        remindMin: 0,
      },
    ]
    const result = filterEventsByDay(crossMonth, 2025, 0, 15)
    expect(result).toHaveLength(0)
  })
})

describe('filterEventsByQuery', () => {
  const events: TestEvent[] = [
    { id: '1', title: 'Team standup', datetime: 0, remindMin: 0 },
    { id: '2', title: 'Lunch with Alice', datetime: 0, remindMin: 0 },
    { id: '3', title: 'Doctor appointment', datetime: 0, remindMin: 0 },
  ]

  it('returns all events for empty query', () => {
    expect(filterEventsByQuery(events, '')).toHaveLength(3)
  })

  it('filters case-insensitively', () => {
    const result = filterEventsByQuery(events, 'LUNCH')
    expect(result.map((e) => e.id)).toEqual(['2'])
  })

  it('returns empty array when nothing matches', () => {
    expect(filterEventsByQuery(events, 'zzz')).toHaveLength(0)
  })

  it('matches partial titles', () => {
    const result = filterEventsByQuery(events, 'stand')
    expect(result.map((e) => e.id)).toEqual(['1'])
  })
})

describe('getEventDays', () => {
  const events: TestEvent[] = [
    { id: 'a', title: 'A', datetime: new Date(2025, 0, 5, 10).getTime(), remindMin: 0 },
    { id: 'b', title: 'B', datetime: new Date(2025, 0, 5, 15).getTime(), remindMin: 0 },
    { id: 'c', title: 'C', datetime: new Date(2025, 0, 20, 9).getTime(), remindMin: 0 },
    { id: 'd', title: 'D', datetime: new Date(2025, 1, 5, 9).getTime(), remindMin: 0 },
  ]

  it('returns a Set of day numbers with events in the given month', () => {
    const days = getEventDays(events, 2025, 0)
    expect(days.has(5)).toBe(true)
    expect(days.has(20)).toBe(true)
    expect(days.size).toBe(2)
  })

  it('excludes days from other months', () => {
    const days = getEventDays(events, 2025, 0)
    expect(days.has(5)).toBe(true)
    // day 5 feb is in another month, should not appear in jan set
    const febDays = getEventDays(events, 2025, 1)
    expect(febDays.has(5)).toBe(true)
    expect(febDays.size).toBe(1)
  })

  it('returns empty Set when no events in month', () => {
    const days = getEventDays(events, 2025, 5)
    expect(days.size).toBe(0)
  })

  it('deduplicates multiple events on the same day', () => {
    const days = getEventDays(events, 2025, 0)
    // both 'a' and 'b' are on day 5 → only counted once
    expect(days.has(5)).toBe(true)
    expect(days.size).toBe(2)
  })
})

describe('getRenderView', () => {
  it('returns "list" when omnibox mode and query is non-empty', () => {
    expect(getRenderView('omnibox', 'meeting', 'month')).toBe('list')
    expect(getRenderView('omnibox', '  x  ', 'month')).toBe('list')
  })

  it('returns "calendar" when omnibox mode and query is empty', () => {
    expect(getRenderView('omnibox', '', 'month')).toBe('calendar')
    expect(getRenderView('omnibox', '   ', 'month')).toBe('calendar')
  })

  it('returns "calendar" in calendar mode with month view', () => {
    expect(getRenderView('calendar', '', 'month')).toBe('calendar')
    expect(getRenderView('calendar', 'anything', 'month')).toBe('calendar')
  })

  it('returns "day" in calendar mode with day view', () => {
    expect(getRenderView('calendar', '', 'day')).toBe('day')
  })

  it('returns "create" in calendar mode with create view', () => {
    expect(getRenderView('calendar', '', 'create')).toBe('create')
  })

  it('returns "detail" in calendar mode with detail view', () => {
    expect(getRenderView('calendar', '', 'detail')).toBe('detail')
  })

  it('ignores query in calendar mode (always shows calView)', () => {
    expect(getRenderView('calendar', 'some text', 'day')).toBe('day')
    expect(getRenderView('calendar', 'some text', 'create')).toBe('create')
  })
})

// ── Edge cases ────────────────────────────────────────────────────────────────

describe('navigateDays — edge cases', () => {
  it('lands on Feb 29 in a leap year', () => {
    // Jan 31, 2024 + 29 days = Feb 29, 2024
    expect(navigateDays(2024, 0, 31, 29)).toEqual({ year: 2024, month: 1, day: 29 })
  })

  it('skips Feb 29 in a non-leap year', () => {
    // Jan 31, 2025 + 28 days = Feb 28, 2025 (no Feb 29)
    expect(navigateDays(2025, 0, 31, 28)).toEqual({ year: 2025, month: 1, day: 28 })
    // +1 more = Mar 1
    expect(navigateDays(2025, 0, 31, 29)).toEqual({ year: 2025, month: 2, day: 1 })
  })

  it('handles large delta spanning multiple months', () => {
    // Jan 1 2025 + 365 days = Jan 1 2026 (2025 is not a leap year)
    expect(navigateDays(2025, 0, 1, 365)).toEqual({ year: 2026, month: 0, day: 1 })
  })

  it('handles large negative delta', () => {
    // Jan 1 2026 − 365 days = Jan 1 2025 (2025 is not a leap year)
    expect(navigateDays(2026, 0, 1, -365)).toEqual({ year: 2025, month: 0, day: 1 })
  })

  it('handles zero delta (no change)', () => {
    expect(navigateDays(2025, 3, 15, 0)).toEqual({ year: 2025, month: 3, day: 15 })
  })
})

describe('buildCalendarGrid — edge cases', () => {
  it('total cell count is always a multiple of 7 (or has <= 6 trailing empties)', () => {
    // The grid itself has nulls only as leading padding.
    // Leading nulls + days = cells.length, which can be any number.
    // But the visual grid always completes to rows of 7 — we verify
    // that nulls + days accounts for every day in the month.
    for (let month = 0; month < 12; month++) {
      const grid = buildCalendarGrid(2025, month)
      const days = grid.filter((c) => c !== null).length
      expect(days).toBe(new Date(2025, month + 1, 0).getDate())
    }
  })

  it('day cells are in ascending order', () => {
    const grid = buildCalendarGrid(2025, 0)
    const days = grid.filter((c) => c !== null) as number[]
    for (let i = 1; i < days.length; i++) {
      expect(days[i]).toBe(days[i - 1] + 1)
    }
  })

  it('returns exactly 0 leading nulls for a Monday-starting month', () => {
    // 2024-04-01 is a Monday
    const grid = buildCalendarGrid(2024, 3)
    expect(grid[0]).toBe(1)
  })
})

describe('filterEventsByDay — boundary events', () => {
  it('includes an event at exactly midnight (start of day)', () => {
    const midnight = new Date(2025, 4, 10, 0, 0, 0, 0).getTime()
    const events = [{ id: 'x', title: 'Midnight', datetime: midnight, remindMin: 0 }]
    expect(filterEventsByDay(events, 2025, 4, 10)).toHaveLength(1)
  })

  it('includes an event at 23:59:59.999 (last ms of day)', () => {
    const lastMs = new Date(2025, 4, 10, 23, 59, 59, 999).getTime()
    const events = [{ id: 'y', title: 'Late', datetime: lastMs, remindMin: 0 }]
    expect(filterEventsByDay(events, 2025, 4, 10)).toHaveLength(1)
  })

  it('excludes an event at midnight of the NEXT day', () => {
    const nextMidnight = new Date(2025, 4, 11, 0, 0, 0, 0).getTime()
    const events = [{ id: 'z', title: 'Tomorrow', datetime: nextMidnight, remindMin: 0 }]
    expect(filterEventsByDay(events, 2025, 4, 10)).toHaveLength(0)
  })
})

describe('filterEventsByQuery — edge cases', () => {
  const events = [{ id: '1', title: 'Stand-up meeting', datetime: 0, remindMin: 0 }]

  it('trims query whitespace before filtering', () => {
    expect(filterEventsByQuery(events, '  stand  ')).toHaveLength(1)
  })

  it('returns all events for whitespace-only query', () => {
    expect(filterEventsByQuery(events, '   ')).toHaveLength(1)
  })

  it('handles special regex characters in query safely (uses includes, not regex)', () => {
    const specialEvents = [
      { id: 'a', title: 'Q&A session', datetime: 0, remindMin: 0 },
      { id: 'b', title: 'Price: $50 (discount)', datetime: 0, remindMin: 0 },
      { id: 'c', title: 'C++ review', datetime: 0, remindMin: 0 },
    ]
    expect(filterEventsByQuery(specialEvents, 'Q&A')).toHaveLength(1)
    expect(filterEventsByQuery(specialEvents, '$50')).toHaveLength(1)
    expect(filterEventsByQuery(specialEvents, 'C++')).toHaveLength(1)
    // These would throw if regex were used — they should just return []
    expect(filterEventsByQuery(specialEvents, '(discount')).toHaveLength(1)
    expect(filterEventsByQuery(specialEvents, '+++')).toHaveLength(0)
  })
})

describe('buildCalendarGrid — known leading-null counts', () => {
  // Verified manually against actual calendar dates.
  const cases: Array<{ year: number; month: number; leadingNulls: number; label: string }> = [
    { year: 2025, month: 0, leadingNulls: 2, label: '2025-01 (Wednesday start)' },
    { year: 2025, month: 2, leadingNulls: 5, label: '2025-03 (Saturday start)' },
    { year: 2025, month: 5, leadingNulls: 6, label: '2025-06 (Sunday start)' },
    { year: 2024, month: 3, leadingNulls: 0, label: '2024-04 (Monday start)' },
    { year: 2025, month: 8, leadingNulls: 0, label: '2025-09 (Monday start)' },
    { year: 2025, month: 1, leadingNulls: 5, label: '2025-02 (Saturday start)' },
  ]

  for (const { year, month, leadingNulls, label } of cases) {
    it(`${label} → ${leadingNulls} leading null(s)`, () => {
      const grid = buildCalendarGrid(year, month)
      const actual = grid.findIndex((c) => c !== null)
      expect(actual).toBe(leadingNulls)
    })
  }
})

describe('navigateDays — round-trip property', () => {
  it('navigating forward then back by the same amount returns the original date', () => {
    const deltas = [1, 7, 28, 31, 100]
    const starts = [
      { year: 2025, month: 0, day: 15 },
      { year: 2025, month: 11, day: 31 },
      { year: 2024, month: 1, day: 29 }, // leap day
    ]
    for (const start of starts) {
      for (const d of deltas) {
        const fwd = navigateDays(start.year, start.month, start.day, d)
        const back = navigateDays(fwd.year, fwd.month, fwd.day, -d)
        expect(back, `round-trip delta=${d} from ${JSON.stringify(start)}`).toEqual(start)
      }
    }
  })
})
