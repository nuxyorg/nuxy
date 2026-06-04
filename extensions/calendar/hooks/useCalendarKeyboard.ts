const React = window.React

import type { CalendarEvent } from '../types.ts'
import type { CalendarActions } from './useCalendarActions.ts'

interface KeyboardState {
  mode: 'omnibox' | 'calendar'
  calView: 'month' | 'day' | 'create' | 'detail'
  query: string
  activeSelect: string | null
  listIdx: number
  dayEvents: CalendarEvent[]
  filteredSearch: CalendarEvent[]
  editingEvent: CalendarEvent | null
  calYear: number
  calMonth: number
  selectedDay: number
  timeValue: string
  reminderValue: string
  defaultReminderMin: number
}

interface Params {
  stateRef: React.MutableRefObject<KeyboardState>
  actions: CalendarActions
  setListIdx: React.Dispatch<React.SetStateAction<number>>
  setActiveSelect: React.Dispatch<React.SetStateAction<string | null>>
  // Deps for the register-actions effect — mirrors the original dependency array
  registerActionsDeps: readonly unknown[]
  t: (key: string) => string
}

export function useCalendarKeyboard({
  stateRef,
  actions,
  setListIdx,
  setActiveSelect,
  registerActionsDeps,
  t,
}: Params): void {
  const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

  _useToolKeyActions([
    // omnibox: ↓ enters calendar (empty query only)
    {
      key: 'ArrowDown',
      label: t('actions.enterCalendar'),
      hint: '↓',
      activeOn: () => stateRef.current.mode === 'omnibox' && !stateRef.current.query.trim(),
      handler: actions.enterCalendarMode,
    },

    // omnibox search: list navigation down
    {
      key: 'ArrowDown',
      label: t('actions.next'),
      hint: '↓',
      activeOn: () => stateRef.current.mode === 'omnibox' && !!stateRef.current.query.trim(),
      handler: () => setListIdx((i) => Math.min(stateRef.current.filteredSearch.length - 1, i + 1)),
    },
    {
      key: 'ArrowUp',
      label: t('actions.prev'),
      hint: '↑',
      activeOn: () =>
        stateRef.current.mode === 'omnibox' &&
        !!stateRef.current.query.trim() &&
        stateRef.current.listIdx > -1,
      handler: () => setListIdx((i) => Math.max(-1, i - 1)),
    },

    // calendar: s returns to omnibox (month/day only — create/detail uses s for save)
    {
      key: 's',
      label: t('actions.search'),
      hint: 'S',
      activeOn: () => {
        const s = stateRef.current
        return s.mode === 'calendar' && (s.calView === 'month' || s.calView === 'day')
      },
      handler: actions.returnToOmnibox,
    },

    // calendar month: arrow navigation
    {
      key: 'ArrowLeft',
      label: t('actions.navigate'),
      hint: '↑↓←→',
      activeOn: () => stateRef.current.mode === 'calendar' && stateRef.current.calView === 'month',
      handler: () => actions.navigateBy(-1),
    },
    {
      key: 'ArrowRight',
      label: '',
      activeOn: () => stateRef.current.mode === 'calendar' && stateRef.current.calView === 'month',
      handler: () => actions.navigateBy(1),
    },
    {
      key: 'ArrowUp',
      label: '',
      activeOn: () => stateRef.current.mode === 'calendar' && stateRef.current.calView === 'month',
      handler: () => actions.navigateBy(-7),
    },
    {
      key: 'ArrowDown',
      label: '',
      activeOn: () => stateRef.current.mode === 'calendar' && stateRef.current.calView === 'month',
      handler: () => actions.navigateBy(7),
    },
    {
      key: 'Enter',
      label: t('actions.open'),
      hint: '↵',
      activeOn: () => stateRef.current.mode === 'calendar' && stateRef.current.calView === 'month',
      handler: actions.enterDayView,
    },

    // calendar day: list navigation
    {
      key: 'ArrowUp',
      label: t('actions.navigate'),
      hint: '↑↓',
      activeOn: () => stateRef.current.mode === 'calendar' && stateRef.current.calView === 'day',
      handler: () => setListIdx((i) => Math.max(-1, i - 1)),
    },
    {
      key: 'ArrowDown',
      label: '',
      activeOn: () => stateRef.current.mode === 'calendar' && stateRef.current.calView === 'day',
      handler: () => setListIdx((i) => Math.min(stateRef.current.dayEvents.length - 1, i + 1)),
    },
    {
      key: 'Enter',
      label: t('actions.open'),
      hint: '↵',
      activeOn: () => {
        const s = stateRef.current
        return (
          s.mode === 'calendar' &&
          s.calView === 'day' &&
          s.listIdx >= 0 &&
          s.listIdx < s.dayEvents.length
        )
      },
      handler: () => {
        const evt = stateRef.current.dayEvents[stateRef.current.listIdx]
        if (evt) actions.enterDetail(evt)
      },
    },

    // Escape: go back
    {
      key: 'Escape',
      label: t('actions.back'),
      hint: 'Esc',
      activeOn: () => {
        const s = stateRef.current
        return (
          s.mode === 'calendar' &&
          (s.calView === 'day' || s.calView === 'create' || s.calView === 'detail')
        )
      },
      handler: () => {
        const { calView, activeSelect } = stateRef.current
        if (activeSelect !== null) {
          setActiveSelect(null)
        } else if (calView === 'day') {
          actions.backToMonth()
        } else {
          actions.backToDay()
        }
      },
    },
  ])

  React.useEffect(() => {
    const {
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
      defaultReminderMin,
    } = stateRef.current

    const registeredActions: Array<{ id: string; label: string; onExecute: () => void }> = []

    if (mode === 'calendar') {
      if (calView === 'month' || calView === 'day') {
        registeredActions.push({
          id: 'calendar-new',
          label: t('actions.newEvent'),
          onExecute: () => actions.enterCreate(defaultReminderMin),
        })
      }
      if (
        (calView === 'day' && listIdx >= 0 && listIdx < dayEvents.length) ||
        (calView === 'detail' && editingEvent != null)
      ) {
        registeredActions.push({
          id: 'calendar-delete',
          label: t('actions.deleteEvent'),
          onExecute: () => {
            const id = calView === 'day' ? dayEvents[listIdx]?.id : editingEvent?.id
            if (!id) return
            actions.deleteEvent(id)
          },
        })
      }
      if ((calView === 'create' || calView === 'detail') && activeSelect === null) {
        registeredActions.push({
          id: 'calendar-save',
          label: t('actions.saveEvent'),
          onExecute: () => {
            if (calView === 'create') {
              actions.createEvent(query, calYear, calMonth, selectedDay, timeValue, reminderValue)
            } else if (calView === 'detail' && editingEvent) {
              actions.updateEvent(editingEvent.id, parseInt(reminderValue, 10))
            }
          },
        })
      }
    }

    window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: registeredActions }))
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: [] }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, registerActionsDeps)
}
