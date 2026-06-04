const React = window.React

const EXT_ID = 'com.nuxy.calendar'
const _useTranslation =
  (window.UI || {}).useTranslation ||
  (() => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' as const }))

import type { CalendarEvent } from './types.ts'
import { useCalendarData } from './hooks/useCalendarData.ts'
import { useCalendarActions } from './hooks/useCalendarActions.ts'
import { useCalendarMeta } from './hooks/useCalendarMeta.ts'
import { useCalendarKeyboard } from './hooks/useCalendarKeyboard.ts'
import {
  useCalendarAnimations,
  useCalendarKeyHintsSync,
  useCalendarLastResultRestore,
  useCalendarDataSync,
} from './hooks/useCalendarSync.ts'
import { CalendarMonthGrid } from './components/CalendarMonthGrid.tsx'
import { CalendarSearchResults } from './components/CalendarSearchResults.tsx'
import { CalendarDayView } from './components/CalendarDayView.tsx'
import { CalendarCreateForm } from './components/CalendarCreateForm.tsx'
import { CalendarDetailView } from './components/CalendarDetailView.tsx'

interface Props {
  query: string
}

export default function CalendarApp({ query }: Props) {
  const { t } = _useTranslation(EXT_ID)
  const todayObj = new Date()
  todayObj.setHours(0, 0, 0, 0)
  const todayYear = todayObj.getFullYear()
  const todayMonth = todayObj.getMonth()
  const todayDate = todayObj.getDate()

  const [mode, setMode] = React.useState<'omnibox' | 'calendar'>('omnibox')
  const [monthEnterDir, setMonthEnterDir] = React.useState<'fromTop' | 'fromBottom' | null>(null)
  const [calYear, setCalYear] = React.useState(todayYear)
  const [calMonth, setCalMonth] = React.useState(todayMonth)
  const [selectedDay, setSelectedDay] = React.useState(todayDate)
  const [calView, setCalView] = React.useState<'month' | 'day' | 'create' | 'detail'>('month')
  const [listIdx, setListIdx] = React.useState(-1)
  const [editingEvent, setEditingEvent] = React.useState<CalendarEvent | null>(null)
  const [timeValue, setTimeValue] = React.useState('10')
  const [reminderValue, setReminderValue] = React.useState('0')
  const [formFieldIdx, setFormFieldIdx] = React.useState(0)
  const [activeSelect, setActiveSelect] = React.useState<string | null>(null)
  const [selectFocused, setSelectFocused] = React.useState(0)

  const {
    monthEvents,
    searchEvents,
    weekStart,
    defaultReminderMin,
    loadMonthEvents,
    loadSearchRange,
  } = useCalendarData()

  const { dayEvents, filteredSearch, eventDays } = useCalendarMeta({
    monthEvents,
    searchEvents,
    calYear,
    calMonth,
    selectedDay,
    query,
  })

  useCalendarDataSync({
    calYear,
    calMonth,
    query,
    todayYear,
    todayMonth,
    mode,
    loadMonthEvents,
    loadSearchRange,
    setCalView,
    setListIdx,
  })

  const stateRef = React.useRef({
    mode,
    query,
    calYear,
    calMonth,
    selectedDay,
    calView,
    dayEvents,
    filteredSearch,
    listIdx,
    editingEvent,
    timeValue,
    reminderValue,
    formFieldIdx,
    activeSelect,
    selectFocused,
    defaultReminderMin,
  })
  stateRef.current = {
    mode,
    query,
    calYear,
    calMonth,
    selectedDay,
    calView,
    dayEvents,
    filteredSearch,
    listIdx,
    editingEvent,
    timeValue,
    reminderValue,
    formFieldIdx,
    activeSelect,
    selectFocused,
    defaultReminderMin,
  }

  const actions = useCalendarActions(stateRef, {
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
  })

  useCalendarAnimations()
  useCalendarKeyHintsSync({ mode, calView, listIdx, activeSelect, formFieldIdx, selectedDay })
  useCalendarLastResultRestore({
    setCalYear,
    setCalMonth,
    setSelectedDay,
    setTimeValue,
    setMode,
    setCalView,
    setFormFieldIdx,
    setActiveSelect,
  })

  useCalendarKeyboard({
    stateRef,
    actions,
    setListIdx,
    setActiveSelect,
    registerActionsDeps: [
      mode,
      calView,
      listIdx,
      dayEvents,
      editingEvent,
      calYear,
      calMonth,
      selectedDay,
      timeValue,
      reminderValue,
      query,
      activeSelect,
    ],
    t,
  })

  const isSearching = mode === 'omnibox' && !!(query || '').trim()

  if (isSearching) {
    return (
      <CalendarSearchResults
        filteredSearch={filteredSearch}
        listIdx={listIdx}
        onSelectEvent={(evt) => {
          const d = new Date(evt.datetime)
          setCalYear(d.getFullYear())
          setCalMonth(d.getMonth())
          setSelectedDay(d.getDate())
          setMode('calendar')
          window.dispatchEvent(
            new CustomEvent('nuxy-shell-omni-bar-control', { detail: { action: 'hide' } })
          )
          setTimeout(() => {
            actions.enterDayView()
            actions.enterDetail(evt)
          }, 0)
        }}
      />
    )
  }

  if (mode === 'omnibox' || calView === 'month') {
    return (
      <CalendarMonthGrid
        calYear={calYear}
        calMonth={calMonth}
        weekStart={weekStart}
        selectedDay={selectedDay}
        mode={mode}
        todayYear={todayYear}
        todayMonth={todayMonth}
        todayDate={todayDate}
        eventDays={eventDays}
        monthEnterDir={monthEnterDir}
        onSelectDay={(day) => setSelectedDay(day)}
        onNavigateToMonth={(year, month, day, dir) => {
          setMonthEnterDir(dir)
          setCalYear(year)
          setCalMonth(month)
          setSelectedDay(day)
        }}
        onEnterCalendarMode={actions.enterCalendarMode}
        onEnterDayView={actions.enterDayView}
      />
    )
  }

  if (calView === 'day') {
    return (
      <CalendarDayView
        calYear={calYear}
        calMonth={calMonth}
        selectedDay={selectedDay}
        dayEvents={dayEvents}
        listIdx={listIdx}
      />
    )
  }

  if (calView === 'create') {
    return (
      <CalendarCreateForm
        calYear={calYear}
        calMonth={calMonth}
        selectedDay={selectedDay}
        query={query}
        timeValue={timeValue}
        reminderValue={reminderValue}
        formFieldIdx={formFieldIdx}
        activeSelect={activeSelect}
        selectFocused={selectFocused}
        onSetFormFieldIdx={setFormFieldIdx}
        onSetSelectFocused={setSelectFocused}
        onSetActiveSelect={setActiveSelect}
        onSetTimeValue={setTimeValue}
        onSetReminderValue={setReminderValue}
      />
    )
  }

  if (calView === 'detail' && editingEvent) {
    return (
      <CalendarDetailView
        editingEvent={editingEvent}
        reminderValue={reminderValue}
        activeSelect={activeSelect}
        selectFocused={selectFocused}
        onSetSelectFocused={setSelectFocused}
        onSetActiveSelect={setActiveSelect}
        onSetReminderValue={setReminderValue}
      />
    )
  }

  return null
}
