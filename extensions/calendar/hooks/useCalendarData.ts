const React = window.React

import type { CalendarEvent } from '../types.ts'
import { ipc as ipcCall } from '../utils/ipc.ts'

export interface CalendarDataResult {
  monthEvents: CalendarEvent[]
  searchEvents: CalendarEvent[]
  weekStart: number
  defaultReminderMin: number
  loadMonthEvents: (year: number, month: number) => void
  loadSearchRange: (todayYear: number, todayMonth: number) => void
}

export function useCalendarData(): CalendarDataResult {
  const [monthEvents, setMonthEvents] = React.useState<CalendarEvent[]>([])
  const [searchEvents, setSearchEvents] = React.useState<CalendarEvent[]>([])
  const [weekStart, setWeekStart] = React.useState(1)
  const [defaultReminderMin, setDefaultReminderMin] = React.useState(0)

  React.useEffect(() => {
    ipcCall('calendar:getConfig', {})
      .then((cfg) => {
        const c = cfg as { defaultReminderMin: number; weekStart: number }
        setWeekStart(c.weekStart ?? 1)
        setDefaultReminderMin(c.defaultReminderMin ?? 0)
      })
      .catch(() => {})
  }, [])

  function loadMonthEvents(year: number, month: number): void {
    const from = new Date(year, month, 1).getTime()
    const to = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime()
    ipcCall('calendar:list', { from, to })
      .then((evts) => setMonthEvents((evts as CalendarEvent[]) || []))
      .catch(() => {})
  }

  function loadSearchRange(todayYear: number, todayMonth: number): void {
    const from = new Date(todayYear, todayMonth, 1).getTime()
    const to = new Date(todayYear, todayMonth + 6, 0, 23, 59, 59, 999).getTime()
    ipcCall('calendar:list', { from, to })
      .then((evts) => setSearchEvents((evts as CalendarEvent[]) || []))
      .catch(() => {})
  }

  return { monthEvents, searchEvents, weekStart, defaultReminderMin, loadMonthEvents, loadSearchRange }
}
