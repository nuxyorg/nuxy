const React = window.React

import type { CalendarEvent } from '../types.ts'
import { ipc as ipcCall } from '../utils/ipc.ts'

function showOmniBar(): void {
  window.dispatchEvent(
    new CustomEvent('nuxy-shell-omni-bar-control', { detail: { action: 'show' } })
  )
}

function hideOmniBar(): void {
  window.dispatchEvent(
    new CustomEvent('nuxy-shell-omni-bar-control', { detail: { action: 'hide' } })
  )
}

export interface CalendarNavigationState {
  calYear: number
  calMonth: number
  selectedDay: number
  calView: 'month' | 'day' | 'create' | 'detail'
  editingEvent: CalendarEvent | null
  dayEvents: CalendarEvent[]
  listIdx: number
  query: string
  timeValue: string
  reminderValue: string
}

export interface CalendarNavigationSetters {
  setMode: React.Dispatch<React.SetStateAction<'omnibox' | 'calendar'>>
  setCalYear: React.Dispatch<React.SetStateAction<number>>
  setCalMonth: React.Dispatch<React.SetStateAction<number>>
  setSelectedDay: React.Dispatch<React.SetStateAction<number>>
  setCalView: React.Dispatch<React.SetStateAction<'month' | 'day' | 'create' | 'detail'>>
  setListIdx: React.Dispatch<React.SetStateAction<number>>
  setEditingEvent: React.Dispatch<React.SetStateAction<CalendarEvent | null>>
  setTimeValue: React.Dispatch<React.SetStateAction<string>>
  setReminderValue: React.Dispatch<React.SetStateAction<string>>
  setFormFieldIdx: React.Dispatch<React.SetStateAction<number>>
  setActiveSelect: React.Dispatch<React.SetStateAction<string | null>>
  setMonthEnterDir: React.Dispatch<React.SetStateAction<'fromTop' | 'fromBottom' | null>>
  loadMonthEvents: (year: number, month: number) => void
}

export interface CalendarActions {
  enterCalendarMode: () => void
  returnToOmnibox: () => void
  enterDayView: () => void
  backToMonth: () => void
  backToDay: () => void
  enterCreate: (defaultReminderMin: number) => void
  enterDetail: (evt: CalendarEvent) => void
  navigateBy: (delta: number) => void
  createEvent: (
    title: string,
    year: number,
    month: number,
    day: number,
    timeValue: string,
    reminderValue: string
  ) => void
  updateEvent: (id: string, remindMin: number) => void
  deleteEvent: (id: string, onDone?: () => void) => void
}

export function useCalendarActions(
  stateRef: React.MutableRefObject<CalendarNavigationState>,
  setters: CalendarNavigationSetters
): CalendarActions {
  const {
    setMode,
    setCalYear,
    setCalMonth,
    setSelectedDay,
    setCalView,
    setListIdx,
    setEditingEvent,
    setTimeValue,
    setReminderValue,
    setFormFieldIdx,
    setActiveSelect,
    setMonthEnterDir,
    loadMonthEvents,
  } = setters

  function enterCalendarMode(): void {
    setMode('calendar')
    setListIdx(-1)
    setCalView('month')
    hideOmniBar()
  }

  function returnToOmnibox(): void {
    setMode('omnibox')
    setListIdx(-1)
    setActiveSelect(null)
    showOmniBar()
  }

  function enterDayView(): void {
    setCalView('day')
    setListIdx(-1)
  }

  function backToMonth(): void {
    setCalView('month')
    setListIdx(-1)
    setEditingEvent(null)
    setActiveSelect(null)
  }

  function backToDay(): void {
    setCalView('day')
    setListIdx(-1)
    setEditingEvent(null)
    setActiveSelect(null)
    hideOmniBar()
  }

  function enterCreate(defaultReminderMin: number): void {
    setTimeValue('10')
    setReminderValue(String(defaultReminderMin))
    setFormFieldIdx(0)
    setActiveSelect(null)
    setCalView('create')
    showOmniBar()
  }

  function enterDetail(evt: CalendarEvent): void {
    setEditingEvent(evt)
    setReminderValue(String(evt.remindMin))
    setFormFieldIdx(0)
    setActiveSelect(null)
    setCalView('detail')
  }

  function navigateBy(delta: number): void {
    const { calYear, calMonth, selectedDay } = stateRef.current
    const d = new Date(calYear, calMonth, selectedDay + delta)
    const year = d.getFullYear()
    const month = d.getMonth()
    const day = d.getDate()
    if (month !== calMonth || year !== calYear) {
      setMonthEnterDir(delta < 0 ? 'fromTop' : 'fromBottom')
    }
    setCalYear(year)
    setCalMonth(month)
    setSelectedDay(day)
  }

  function createEvent(
    title: string,
    year: number,
    month: number,
    day: number,
    timeValue: string,
    reminderValue: string
  ): void {
    if (!title.trim()) return
    const base = new Date(year, month, day)
    base.setHours(parseInt(timeValue, 10), 0, 0, 0)
    ipcCall('calendar:create', {
      title,
      datetime: base.getTime(),
      notes: '',
      remindMin: parseInt(reminderValue, 10),
    })
      .then(() => {
        loadMonthEvents(year, month)
        backToDay()
      })
      .catch(() => {})
  }

  function updateEvent(id: string, remindMin: number): void {
    const { calYear, calMonth } = stateRef.current
    ipcCall('calendar:update', { id, remindMin })
      .then(() => {
        loadMonthEvents(calYear, calMonth)
        backToDay()
      })
      .catch(() => {})
  }

  function deleteEvent(id: string, onDone?: () => void): void {
    const { calYear, calMonth, calView } = stateRef.current
    ipcCall('calendar:delete', { id })
      .then(() => {
        loadMonthEvents(calYear, calMonth)
        if (calView === 'detail') backToDay()
        onDone?.()
      })
      .catch(() => {})
  }

  return {
    enterCalendarMode,
    returnToOmnibox,
    enterDayView,
    backToMonth,
    backToDay,
    enterCreate,
    enterDetail,
    navigateBy,
    createEvent,
    updateEvent,
    deleteEvent,
  }
}
