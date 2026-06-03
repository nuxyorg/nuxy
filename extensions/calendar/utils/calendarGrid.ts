export interface GridCell {
  day: number
  monthOffset: -1 | 0 | 1 // -1 = prev month, 0 = current, 1 = next month
}

export const ALL_DAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * Builds a 42-cell (6×7) grid for a month calendar view.
 * Cells for overflow days from prev/next month are included with the
 * appropriate monthOffset so the grid is always fully populated.
 */
export function buildGrid(year: number, month: number, weekStart: number = 1): GridCell[] {
  const total = getDaysInMonth(year, month)
  const firstWeekday = (new Date(year, month, 1).getDay() - weekStart + 7) % 7
  const prevTotal = getDaysInMonth(year, month - 1)
  const cells: GridCell[] = []
  for (let i = firstWeekday; i > 0; i--) cells.push({ day: prevTotal - i + 1, monthOffset: -1 })
  for (let d = 1; d <= total; d++) cells.push({ day: d, monthOffset: 0 })
  let nd = 1
  while (cells.length < 42) cells.push({ day: nd++, monthOffset: 1 })
  return cells
}

/**
 * Returns the abbreviated weekday header row given the week's starting day.
 */
export function buildDayAbbr(weekStart: number): string[] {
  return Array.from({ length: 7 }, (_, i) => ALL_DAY_ABBR[(weekStart + i) % 7])
}

/**
 * Shifts a date by `delta` days, returning the resulting year/month/day.
 */
export function shiftDays(
  year: number,
  month: number,
  day: number,
  delta: number
): { year: number; month: number; day: number } {
  const d = new Date(year, month, day + delta)
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() }
}
