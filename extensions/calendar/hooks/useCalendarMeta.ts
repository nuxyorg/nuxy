const React = window.React

import type { CalendarEvent } from '../types.ts'
import { filterEventsByDay, filterEventsByQuery, getEventDays } from '../calendar-utils.ts'

interface Params {
  monthEvents: CalendarEvent[]
  searchEvents: CalendarEvent[]
  calYear: number
  calMonth: number
  selectedDay: number
  query: string
}

export interface CalendarMeta {
  dayEvents: CalendarEvent[]
  filteredSearch: CalendarEvent[]
  eventDays: Set<number>
}

export function useCalendarMeta({
  monthEvents,
  searchEvents,
  calYear,
  calMonth,
  selectedDay,
  query,
}: Params): CalendarMeta {
  const dayEvents = React.useMemo(
    () => filterEventsByDay(monthEvents, calYear, calMonth, selectedDay),
    [monthEvents, calYear, calMonth, selectedDay]
  )

  const filteredSearch = React.useMemo(() => {
    const q = (query || '').trim()
    if (!q) return []
    return filterEventsByQuery(searchEvents, q)
  }, [searchEvents, query])

  const eventDays = React.useMemo(
    () => getEventDays(monthEvents, calYear, calMonth),
    [monthEvents, calYear, calMonth]
  )

  return { dayEvents, filteredSearch, eventDays }
}
