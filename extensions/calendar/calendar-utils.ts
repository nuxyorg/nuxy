export type CalendarMode = 'omnibox' | 'calendar'
export type CalendarView = 'month' | 'day' | 'create' | 'detail'
export type RenderView = 'list' | 'calendar' | 'day' | 'create' | 'detail'

export interface MinimalEvent {
  id: string
  title: string
  datetime: number
  remindMin: number
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

// Monday-first weekday index (0 = Monday, 6 = Sunday)
function mondayFirstWeekday(date: Date): number {
  return (date.getDay() + 6) % 7
}

export function buildCalendarGrid(year: number, month: number): (number | null)[] {
  const daysInMonth = getDaysInMonth(year, month)
  const firstWeekday = mondayFirstWeekday(new Date(year, month, 1))
  const cells: (number | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  return cells
}

export function navigateDays(
  year: number,
  month: number,
  day: number,
  delta: number
): { year: number; month: number; day: number } {
  const d = new Date(year, month, day + delta)
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() }
}

export function filterEventsByDay<T extends MinimalEvent>(
  events: T[],
  year: number,
  month: number,
  day: number
): T[] {
  const start = new Date(year, month, day).getTime()
  const end = new Date(year, month, day, 23, 59, 59, 999).getTime()
  return events.filter((e) => e.datetime >= start && e.datetime <= end)
}

export function filterEventsByQuery<T extends MinimalEvent>(events: T[], query: string): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return events
  return events.filter((e) => e.title.toLowerCase().includes(q))
}

export function getEventDays<T extends MinimalEvent>(
  events: T[],
  year: number,
  month: number
): Set<number> {
  const days = new Set<number>()
  for (const e of events) {
    const d = new Date(e.datetime)
    if (d.getFullYear() === year && d.getMonth() === month) {
      days.add(d.getDate())
    }
  }
  return days
}

export function getRenderView(
  mode: CalendarMode,
  query: string,
  calView: CalendarView
): RenderView {
  if (mode === 'omnibox' && query.trim()) return 'list'
  return calView === 'month' ? 'calendar' : calView
}
