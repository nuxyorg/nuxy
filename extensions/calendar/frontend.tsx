const React = window.React
const { useState, useEffect, useMemo, useRef } = React
const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

const EXT_ID = 'com.nuxy.calendar'

interface Props {
  query: string
}

interface CalendarEvent {
  id: string
  title: string
  datetime: number
  remindMin: number
}

interface SelectOption {
  value: string
  label: string
}

// ── Pure helpers ─────────────────────────────────────────────────────────────
interface GridCell {
  day: number
  monthOffset: -1 | 0 | 1  // -1 prev, 0 current, 1 next
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function mondayWeekday(d: Date): number {
  return (d.getDay() + 6) % 7
}

function buildGrid(year: number, month: number): GridCell[] {
  const total = getDaysInMonth(year, month)
  const firstWeekday = mondayWeekday(new Date(year, month, 1))
  const prevTotal = getDaysInMonth(year, month - 1)
  const cells: GridCell[] = []
  for (let i = firstWeekday; i > 0; i--) cells.push({ day: prevTotal - i + 1, monthOffset: -1 })
  for (let d = 1; d <= total; d++) cells.push({ day: d, monthOffset: 0 })
  let nd = 1
  while (cells.length < 42) cells.push({ day: nd++, monthOffset: 1 })
  return cells
}

function shiftDays(
  year: number,
  month: number,
  day: number,
  delta: number
): { year: number; month: number; day: number } {
  const d = new Date(year, month, day + delta)
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() }
}

function eventsForDay(events: CalendarEvent[], year: number, month: number, day: number) {
  const start = new Date(year, month, day).getTime()
  const end = new Date(year, month, day, 23, 59, 59, 999).getTime()
  return events.filter((e) => e.datetime >= start && e.datetime <= end)
}

function daysWithEvents(events: CalendarEvent[], year: number, month: number): Set<number> {
  const s = new Set<number>()
  for (const e of events) {
    const d = new Date(e.datetime)
    if (d.getFullYear() === year && d.getMonth() === month) s.add(d.getDate())
  }
  return s
}

// ── Create form constants ─────────────────────────────────────────────────────
// field 0 = title (text input), 1 = time (select), 2 = reminder (select)
const CREATE_FORM_FIELDS = ['title', 'time', 'reminder'] as const
type CreateFormField = (typeof CREATE_FORM_FIELDS)[number]

function isSelectField(f: CreateFormField): boolean {
  return f === 'time' || f === 'reminder'
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_ABBR = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const TIME_OPTIONS: SelectOption[] = [
  { value: '8', label: '8:00 AM' },
  { value: '9', label: '9:00 AM' },
  { value: '10', label: '10:00 AM' },
  { value: '11', label: '11:00 AM' },
  { value: '12', label: '12:00 PM' },
  { value: '13', label: '1:00 PM' },
  { value: '14', label: '2:00 PM' },
  { value: '15', label: '3:00 PM' },
  { value: '16', label: '4:00 PM' },
  { value: '17', label: '5:00 PM' },
  { value: '18', label: '6:00 PM' },
  { value: '19', label: '7:00 PM' },
]
const REMINDER_OPTIONS: SelectOption[] = [
  { value: '0', label: 'No reminder' },
  { value: '5', label: '5 min before' },
  { value: '15', label: '15 min before' },
  { value: '30', label: '30 min before' },
  { value: '60', label: '1 hour before' },
  { value: '1440', label: '1 day before' },
]

// ── IPC / shell helpers ───────────────────────────────────────────────────────
function ipcCall(channel: string, payload: unknown): Promise<unknown> {
  return window.core.ipc.invoke(EXT_ID, channel, payload).then((res) => {
    const r = res as { success: boolean; error?: string; data?: unknown } | null
    if (!r?.success) throw new Error(r?.error || 'IPC failed')
    return r.data
  })
}

function showOmniBar() {
  window.dispatchEvent(
    new CustomEvent('nuxy-shell-omni-bar-control', { detail: { action: 'show' } })
  )
}

function hideOmniBar() {
  window.dispatchEvent(
    new CustomEvent('nuxy-shell-omni-bar-control', { detail: { action: 'hide' } })
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CalendarApp({ query }: Props) {
  const {
    List,
    ListItem,
    ListItemBody,
    ListItemText,
    ListItemMeta,
    ListItemActions,
    EmptyState,
    SelectBox,
    IconBell,
    Input,
  } = window.UI || {}

  const todayObj = new Date()
  todayObj.setHours(0, 0, 0, 0)
  const todayYear = todayObj.getFullYear()
  const todayMonth = todayObj.getMonth()
  const todayDate = todayObj.getDate()

  const [mode, setMode] = useState<'omnibox' | 'calendar'>('omnibox')
  const [monthEnterDir, setMonthEnterDir] = useState<'fromTop' | 'fromBottom' | null>(null)

  const [calYear, setCalYear] = useState(todayYear)
  const [calMonth, setCalMonth] = useState(todayMonth)
  const [selectedDay, setSelectedDay] = useState(todayDate)
  const [calView, setCalView] = useState<'month' | 'day' | 'create' | 'detail'>('month')

  const [monthEvents, setMonthEvents] = useState<CalendarEvent[]>([])
  const [searchEvents, setSearchEvents] = useState<CalendarEvent[]>([])

  const [listIdx, setListIdx] = useState(-1)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)

  // Create form state
  const [titleValue, setTitleValue] = useState('')
  const [timeValue, setTimeValue] = useState('10')
  const [reminderValue, setReminderValue] = useState('0')
  const [formFieldIdx, setFormFieldIdx] = useState(0)
  const [activeSelect, setActiveSelect] = useState<string | null>(null)
  const [selectFocused, setSelectFocused] = useState(0)

  const titleInputRef = useRef<HTMLInputElement | null>(null)

  // ── Derived ──────────────────────────────────────────────────────────────────
  const dayEvents = useMemo(
    () => eventsForDay(monthEvents, calYear, calMonth, selectedDay),
    [monthEvents, calYear, calMonth, selectedDay]
  )

  const filteredSearch = useMemo(() => {
    const q = (query || '').trim().toLowerCase()
    if (!q) return []
    return searchEvents.filter((e) => e.title.toLowerCase().includes(q))
  }, [searchEvents, query])

  const eventDays = useMemo(
    () => daysWithEvents(monthEvents, calYear, calMonth),
    [monthEvents, calYear, calMonth]
  )

  // ── staleRef ─────────────────────────────────────────────────────────────────
  const stateRef = useRef({
    mode, query,
    calYear, calMonth, selectedDay,
    calView,
    dayEvents, filteredSearch,
    listIdx, editingEvent,
    titleValue, timeValue, reminderValue,
    formFieldIdx, activeSelect, selectFocused,
  })

  stateRef.current = {
    mode, query,
    calYear, calMonth, selectedDay,
    calView,
    dayEvents, filteredSearch,
    listIdx, editingEvent,
    titleValue, timeValue, reminderValue,
    formFieldIdx, activeSelect, selectFocused,
  }

  // ── Data loading ──────────────────────────────────────────────────────────────
  function loadMonthEvents(year: number, month: number): void {
    const from = new Date(year, month, 1).getTime()
    const to = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime()
    ipcCall('calendar:list', { from, to })
      .then((evts) => setMonthEvents((evts as CalendarEvent[]) || []))
      .catch(() => {})
  }

  function loadSearchRange(): void {
    const from = new Date(todayYear, todayMonth, 1).getTime()
    const to = new Date(todayYear, todayMonth + 6, 0, 23, 59, 59, 999).getTime()
    ipcCall('calendar:list', { from, to })
      .then((evts) => setSearchEvents((evts as CalendarEvent[]) || []))
      .catch(() => {})
  }

  useEffect(() => {
    loadMonthEvents(calYear, calMonth)
  }, [calYear, calMonth])

  const hasQuery = !!(query || '').trim()
  useEffect(() => {
    if (hasQuery) loadSearchRange()
  }, [hasQuery])

  useEffect(() => {
    if (mode === 'omnibox') {
      setCalView('month')
      setListIdx(-1)
    }
  }, [mode])

  // Focus/blur title input based on formFieldIdx in create view
  useEffect(() => {
    if (calView === 'create') {
      if (formFieldIdx === 0 && activeSelect === null) {
        setTimeout(() => titleInputRef.current?.focus(), 0)
      } else {
        titleInputRef.current?.blur()
      }
    }
  }, [calView, formFieldIdx, activeSelect])

  useEffect(() => {
    if (document.getElementById('cal-slide-anim')) return
    const s = document.createElement('style')
    s.id = 'cal-slide-anim'
    s.textContent = [
      '@keyframes calFromTop{from{transform:translateY(-24px);opacity:0}to{transform:translateY(0);opacity:1}}',
      '@keyframes calFromBottom{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}',
    ].join('')
    document.head.appendChild(s)
  }, [])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [mode, calView, listIdx, activeSelect, formFieldIdx, selectedDay])

  // ── Navigation helpers ────────────────────────────────────────────────────────
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

  function navigateBy(delta: number): void {
    const { calYear, calMonth, selectedDay } = stateRef.current
    const { year, month, day } = shiftDays(calYear, calMonth, selectedDay, delta)
    if (month !== calMonth || year !== calYear) {
      setMonthEnterDir(delta < 0 ? 'fromTop' : 'fromBottom')
    }
    setCalYear(year)
    setCalMonth(month)
    setSelectedDay(day)
  }

  function enterDayView(): void {
    setCalView('day')
    setListIdx(-1)
  }

  function enterCreate(): void {
    setTitleValue('')
    setTimeValue('10')
    setReminderValue('0')
    setFormFieldIdx(0)
    setActiveSelect(null)
    setCalView('create')
  }

  function enterDetail(evt: CalendarEvent): void {
    setEditingEvent(evt)
    setReminderValue(String(evt.remindMin))
    setFormFieldIdx(0)
    setActiveSelect(null)
    setCalView('detail')
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
  }

  function getSelectOptions(field: string): SelectOption[] {
    return field === 'time' ? TIME_OPTIONS : REMINDER_OPTIONS
  }

  function getSelectValue(field: string): string {
    return field === 'time' ? stateRef.current.timeValue : stateRef.current.reminderValue
  }

  function setSelectValue(field: string, val: string): void {
    if (field === 'time') setTimeValue(val)
    else setReminderValue(val)
  }

  // ── Key actions ───────────────────────────────────────────────────────────────
  _useToolKeyActions([
    // omnibox: ↓ enters calendar (empty query only)
    {
      key: 'ArrowDown',
      label: 'Enter calendar',
      hint: '↓',
      activeOn: () => stateRef.current.mode === 'omnibox' && !stateRef.current.query.trim(),
      handler: enterCalendarMode,
    },

    // omnibox search: list navigation
    {
      key: 'ArrowDown',
      label: 'Next',
      hint: '↓',
      activeOn: () => stateRef.current.mode === 'omnibox' && !!stateRef.current.query.trim(),
      handler: () => {
        const { filteredSearch } = stateRef.current
        setListIdx((i) => Math.min(filteredSearch.length - 1, i + 1))
      },
    },
    {
      key: 'ArrowUp',
      label: 'Prev',
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
      label: 'Search',
      hint: 'S',
      activeOn: () => {
        const s = stateRef.current
        return s.mode === 'calendar' && (s.calView === 'month' || s.calView === 'day')
      },
      handler: returnToOmnibox,
    },

    // calendar month: arrow navigation
    {
      key: 'ArrowLeft',
      label: 'Navigate',
      hint: '↑↓←→',
      activeOn: () =>
        stateRef.current.mode === 'calendar' && stateRef.current.calView === 'month',
      handler: () => navigateBy(-1),
    },
    {
      key: 'ArrowRight',
      label: '',
      activeOn: () =>
        stateRef.current.mode === 'calendar' && stateRef.current.calView === 'month',
      handler: () => navigateBy(1),
    },
    {
      key: 'ArrowUp',
      label: '',
      activeOn: () =>
        stateRef.current.mode === 'calendar' && stateRef.current.calView === 'month',
      handler: () => navigateBy(-7),
    },
    {
      key: 'ArrowDown',
      label: '',
      activeOn: () =>
        stateRef.current.mode === 'calendar' && stateRef.current.calView === 'month',
      handler: () => navigateBy(7),
    },
    {
      key: 'Enter',
      label: 'Open',
      hint: '↵',
      activeOn: () =>
        stateRef.current.mode === 'calendar' && stateRef.current.calView === 'month',
      handler: enterDayView,
    },

    // calendar day: list navigation
    {
      key: 'ArrowUp',
      label: 'Navigate',
      hint: '↑↓',
      activeOn: () =>
        stateRef.current.mode === 'calendar' && stateRef.current.calView === 'day',
      handler: () => setListIdx((i) => Math.max(-1, i - 1)),
    },
    {
      key: 'ArrowDown',
      label: '',
      activeOn: () =>
        stateRef.current.mode === 'calendar' && stateRef.current.calView === 'day',
      handler: () =>
        setListIdx((i) => Math.min(stateRef.current.dayEvents.length - 1, i + 1)),
    },
    {
      key: 'Enter',
      label: 'Open',
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
        if (evt) enterDetail(evt)
      },
    },

    // n: new event (month or day view)
    {
      key: 'n',
      label: 'New Event',
      hint: 'N',
      activeOn: () => {
        const s = stateRef.current
        return s.mode === 'calendar' && (s.calView === 'month' || s.calView === 'day')
      },
      handler: enterCreate,
    },

    // d: delete
    {
      key: 'd',
      label: 'Delete',
      hint: 'D',
      activeOn: () => {
        const s = stateRef.current
        return (
          s.mode === 'calendar' &&
          ((s.calView === 'day' && s.listIdx >= 0 && s.listIdx < s.dayEvents.length) ||
            (s.calView === 'detail' && s.editingEvent != null))
        )
      },
      handler: () => {
        const s = stateRef.current
        const id = s.calView === 'day' ? s.dayEvents[s.listIdx]?.id : s.editingEvent?.id
        if (!id) return
        ipcCall('calendar:delete', { id })
          .then(() => {
            loadMonthEvents(s.calYear, s.calMonth)
            if (s.calView === 'detail') backToDay()
          })
          .catch(() => {})
      },
    },

    // create/detail: ArrowUp — handles both dropdown navigation and field navigation
    {
      key: 'ArrowUp',
      label: 'Navigate',
      hint: '↑↓',
      activeOn: () => {
        const s = stateRef.current
        return s.mode === 'calendar' && (s.calView === 'create' || s.calView === 'detail')
      },
      handler: () => {
        const { activeSelect, formFieldIdx } = stateRef.current
        if (activeSelect !== null) {
          setSelectFocused((i) => Math.max(0, i - 1))
        } else if (formFieldIdx > 0) {
          setFormFieldIdx((i) => i - 1)
        }
      },
    },

    // create/detail: ArrowDown — handles both dropdown navigation and field navigation
    {
      key: 'ArrowDown',
      label: '',
      activeOn: () => {
        const s = stateRef.current
        return s.mode === 'calendar' && (s.calView === 'create' || s.calView === 'detail')
      },
      handler: () => {
        const { calView, activeSelect, formFieldIdx } = stateRef.current
        if (activeSelect !== null) {
          const opts = getSelectOptions(activeSelect)
          setSelectFocused((i) => Math.min(opts.length - 1, i + 1))
        } else {
          const fields = calView === 'detail' ? ['reminder'] : CREATE_FORM_FIELDS
          setFormFieldIdx((i) => Math.min(fields.length - 1, i + 1))
        }
      },
    },

    // create/detail: Enter — open select, advance from title, or confirm selection
    {
      key: 'Enter',
      label: activeSelect !== null ? 'Confirm' : 'Select',
      hint: '↵',
      activeOn: () => {
        const s = stateRef.current
        return s.mode === 'calendar' && (s.calView === 'create' || s.calView === 'detail')
      },
      handler: () => {
        const s = stateRef.current
        if (s.activeSelect !== null) {
          // Confirm dropdown selection
          const opts = getSelectOptions(s.activeSelect)
          const opt = opts[s.selectFocused]
          if (opt) setSelectValue(s.activeSelect, opt.value)
          setActiveSelect(null)
          const fields = s.calView === 'detail' ? ['reminder'] : CREATE_FORM_FIELDS
          const fi = fields.indexOf(s.activeSelect as (typeof CREATE_FORM_FIELDS)[number])
          if (fi >= 0 && fi < fields.length - 1) setFormFieldIdx(fi + 1)
        } else {
          const fields = s.calView === 'detail' ? ['reminder'] : CREATE_FORM_FIELDS
          const field = fields[s.formFieldIdx] as CreateFormField | undefined
          if (!field) return
          if (field === 'title') {
            // Enter on title field advances to next field
            setFormFieldIdx((i) => Math.min(fields.length - 1, i + 1))
          } else {
            // Open select for this field
            const opts = getSelectOptions(field)
            const cur = getSelectValue(field)
            setSelectFocused(Math.max(0, opts.findIndex((o) => o.value === cur)))
            setActiveSelect(field)
          }
        }
      },
    },

    // create/detail: s saves
    {
      key: 's',
      label: 'Save',
      hint: 'S',
      activeOn: () => {
        const s = stateRef.current
        return (
          s.mode === 'calendar' &&
          (s.calView === 'create' || s.calView === 'detail') &&
          s.activeSelect === null
        )
      },
      handler: () => {
        const s = stateRef.current
        if (s.calView === 'create') {
          const title = s.titleValue.trim()
          if (!title) return
          const base = new Date(s.calYear, s.calMonth, s.selectedDay)
          base.setHours(parseInt(s.timeValue, 10), 0, 0, 0)
          ipcCall('calendar:create', {
            title,
            datetime: base.getTime(),
            notes: '',
            remindMin: parseInt(s.reminderValue, 10),
          })
            .then(() => {
              loadMonthEvents(s.calYear, s.calMonth)
              backToDay()
            })
            .catch(() => {})
        } else if (s.calView === 'detail' && s.editingEvent) {
          ipcCall('calendar:update', {
            id: s.editingEvent.id,
            remindMin: parseInt(s.reminderValue, 10),
          })
            .then(() => {
              loadMonthEvents(s.calYear, s.calMonth)
              backToDay()
            })
            .catch(() => {})
        }
      },
    },

    // Escape: go back
    {
      key: 'Escape',
      label: 'Back',
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
          backToMonth()
        } else {
          backToDay()
        }
      },
    },
  ])

  // ── Month grid ─────────────────────────────────────────────────────────────────
  function renderMonthGrid() {
    const grid = buildGrid(calYear, calMonth)
    const isCurrentCalMonth = calYear === todayYear && calMonth === todayMonth

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--space-3) var(--space-4) var(--space-2)',
          }}
        >
          <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>
            {MONTH_NAMES[calMonth]} {calYear}
          </span>
          {mode === 'calendar' && (
            <span style={{ fontSize: 'var(--font-xs)', opacity: 0.55 }}>
              {new Date(calYear, calMonth, selectedDay).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </div>

        {/* Day abbreviation row — outside the animated wrapper so it doesn't slide */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '2px',
            padding: '0 var(--space-3) 2px',
          }}
        >
          {DAY_ABBR.map((abbr) => (
            <div
              key={abbr}
              style={{
                textAlign: 'center',
                fontSize: 'var(--font-xs)',
                opacity: 0.3,
                padding: '0 0 2px',
                fontWeight: 600,
              }}
            >
              {abbr}
            </div>
          ))}
        </div>

        {/* Animated grid — keyed by month so React remounts on month change */}
        <div style={{ overflow: 'clip', flex: 1, minHeight: 0 }}>
          <div
            key={`${calYear}-${calMonth}`}
            style={{
              height: '100%',
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gridTemplateRows: 'repeat(6, 1fr)',
              gap: '2px',
              padding: '0 var(--space-3) var(--space-3)',
              animation: monthEnterDir
                ? `cal${monthEnterDir === 'fromTop' ? 'FromTop' : 'FromBottom'} 0.22s ease`
                : undefined,
            }}
          >
            {grid.map((cell, idx) => {
              const isCurrent = cell.monthOffset === 0
              const isToday = isCurrent && isCurrentCalMonth && cell.day === todayDate
              const isSelected = isCurrent && mode === 'calendar' && cell.day === selectedDay
              const hasEvent = isCurrent && eventDays.has(cell.day)

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (!isCurrent) {
                      // Clicking overflow day: navigate to that month
                      const d = new Date(calYear, calMonth + cell.monthOffset, cell.day)
                      setMonthEnterDir(cell.monthOffset < 0 ? 'fromTop' : 'fromBottom')
                      setCalYear(d.getFullYear())
                      setCalMonth(d.getMonth())
                      setSelectedDay(cell.day)
                      if (mode === 'calendar') enterDayView()
                      else { enterCalendarMode(); setTimeout(enterDayView, 0) }
                      return
                    }
                    setSelectedDay(cell.day)
                    if (mode === 'calendar') enterDayView()
                    else { enterCalendarMode(); setTimeout(enterDayView, 0) }
                  }}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: 'var(--font-xs)',
                    fontWeight: isToday ? 700 : 400,
                    background: isSelected
                      ? 'var(--accent, #6366f1)'
                      : isToday
                        ? 'var(--accent-subtle, rgba(99, 102, 241, 0.15))'
                        : 'transparent',
                    color: isSelected ? '#fff' : 'inherit',
                    outline:
                      isToday && !isSelected ? '1.5px solid var(--accent, #6366f1)' : 'none',
                    outlineOffset: '-1px',
                    opacity: !isCurrent ? 0.25 : mode === 'omnibox' ? 0.75 : 1,
                  }}
                >
                  {cell.day}
                  {hasEvent && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '2px',
                        width: '3px',
                        height: '3px',
                        borderRadius: '50%',
                        background: isSelected
                          ? 'rgba(255, 255, 255, 0.7)'
                          : 'var(--accent, #6366f1)',
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────────
  const isSearching = mode === 'omnibox' && !!(query || '').trim()

  if (isSearching) {
    return (
      <div style={{ height: '100%' }}>
        {filteredSearch.length === 0
          ? EmptyState && (
              <EmptyState message="No events found" hint="Try a different search." />
            )
          : List && (
              <List>
                {filteredSearch.map((evt, idx) => (
                  <ListItem
                    key={evt.id}
                    active={idx === listIdx}
                    onClick={() => {
                      const d = new Date(evt.datetime)
                      setCalYear(d.getFullYear())
                      setCalMonth(d.getMonth())
                      setSelectedDay(d.getDate())
                      setMode('calendar')
                      hideOmniBar()
                      setTimeout(() => {
                        enterDayView()
                        enterDetail(evt)
                      }, 0)
                    }}
                  >
                    <ListItemBody>
                      <ListItemText>{evt.title}</ListItemText>
                      <ListItemMeta>
                        {new Date(evt.datetime).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </ListItemMeta>
                    </ListItemBody>
                    {evt.remindMin > 0 && IconBell && ListItemActions && (
                      <ListItemActions>
                        <IconBell
                          style={{ width: '14px', height: '14px', color: 'var(--color-warning, #eab308)' }}
                        />
                      </ListItemActions>
                    )}
                  </ListItem>
                ))}
              </List>
            )}
      </div>
    )
  }

  if (mode === 'omnibox' || calView === 'month') {
    return renderMonthGrid()
  }

  // ── Day view ─────────────────────────────────────────────────────────────────
  if (calView === 'day') {
    const dayLabel = new Date(calYear, calMonth, selectedDay).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    return (
      <div style={{ height: '100%' }}>
        <div
          style={{
            padding: 'var(--space-3) var(--space-4) var(--space-1)',
            opacity: 0.55,
            fontSize: 'var(--font-sm)',
          }}
        >
          {dayLabel}
        </div>
        {dayEvents.length === 0
          ? EmptyState && (
              <EmptyState message="No events" hint="Press N to create an event." />
            )
          : List && (
              <List>
                {dayEvents.map((evt, idx) => (
                  <ListItem key={evt.id} active={idx === listIdx} onClick={() => enterDetail(evt)}>
                    <ListItemBody>
                      <ListItemText>{evt.title}</ListItemText>
                      <ListItemMeta>
                        {new Date(evt.datetime).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </ListItemMeta>
                    </ListItemBody>
                    {evt.remindMin > 0 && IconBell && ListItemActions && (
                      <ListItemActions>
                        <IconBell
                          style={{ width: '14px', height: '14px', color: 'var(--color-warning, #eab308)' }}
                        />
                      </ListItemActions>
                    )}
                  </ListItem>
                ))}
              </List>
            )}
      </div>
    )
  }

  // ── Create view ───────────────────────────────────────────────────────────────
  if (calView === 'create') {
    const dateLabel = new Date(calYear, calMonth, selectedDay).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    const fieldCurrentValues: Record<string, string> = { time: timeValue, reminder: reminderValue }
    const fieldLabel: Record<string, string> = { time: 'Time', reminder: 'Reminder' }

    return (
      <div style={{ height: '100%' }}>
        <div
          style={{
            padding: 'var(--space-3) var(--space-4) var(--space-1)',
            opacity: 0.55,
            fontSize: 'var(--font-sm)',
          }}
        >
          {dateLabel}
        </div>

        {List && (
          <List>
            {/* Title field — inline text input */}
            <ListItem active={formFieldIdx === 0 && activeSelect === null}>
              <ListItemBody>
                <ListItemText>Title</ListItemText>
              </ListItemBody>
              {Input && (
                <div style={{ flex: 1, padding: '0 var(--space-3) 0 var(--space-2)' }}>
                  <Input
                    ref={titleInputRef}
                    value={titleValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setTitleValue(e.target.value)
                    }
                    onFocus={() => {
                      setFormFieldIdx(0)
                      setActiveSelect(null)
                    }}
                    placeholder="Event title"
                    style={{ width: '100%' }}
                  />
                </div>
              )}
            </ListItem>

            {/* Time and Reminder — SelectBox */}
            {(['time', 'reminder'] as const).map((field, i) => {
              const idx = i + 1 // field index (0 = title)
              const opts = getSelectOptions(field)
              const currentVal = fieldCurrentValues[field]
              const isFieldFocused = idx === formFieldIdx && activeSelect === null
              return (
                <ListItem
                  key={field}
                  active={isFieldFocused}
                  onClick={() => {
                    setFormFieldIdx(idx)
                    setSelectFocused(Math.max(0, opts.findIndex((o) => o.value === currentVal)))
                    setActiveSelect(field)
                  }}
                >
                  <ListItemBody>
                    <ListItemText>{fieldLabel[field]}</ListItemText>
                    <ListItemMeta>{opts.find((o) => o.value === currentVal)?.label ?? '—'}</ListItemMeta>
                  </ListItemBody>
                  {ListItemActions && SelectBox && (
                    <ListItemActions>
                      <SelectBox
                        options={opts}
                        value={currentVal}
                        open={activeSelect === field}
                        focusedIndex={activeSelect === field ? selectFocused : 0}
                        onSelect={(val: string) => {
                          setSelectValue(field, val)
                          setActiveSelect(null)
                          if (idx < CREATE_FORM_FIELDS.length - 1) setFormFieldIdx(idx + 1)
                        }}
                        onClose={() => setActiveSelect(null)}
                        onOpen={(startIdx: number) => {
                          setFormFieldIdx(idx)
                          setSelectFocused(startIdx)
                          setActiveSelect(field)
                        }}
                      />
                    </ListItemActions>
                  )}
                </ListItem>
              )
            })}
          </List>
        )}
      </div>
    )
  }

  // ── Detail view ───────────────────────────────────────────────────────────────
  if (calView === 'detail' && editingEvent) {
    const opts = REMINDER_OPTIONS
    const dateLabel = new Date(editingEvent.datetime).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    return (
      <div style={{ height: '100%' }}>
        <div style={{ padding: 'var(--space-3) var(--space-4) var(--space-1)' }}>
          <div style={{ fontWeight: 600, fontSize: 'var(--font-md)' }}>{editingEvent.title}</div>
          <div style={{ fontSize: 'var(--font-sm)', opacity: 0.55, marginTop: 'var(--space-1)' }}>
            {dateLabel}
          </div>
        </div>
        {List && (
          <List>
            <ListItem
              active={activeSelect === null}
              onClick={() => {
                setSelectFocused(Math.max(0, opts.findIndex((o) => o.value === reminderValue)))
                setActiveSelect('reminder')
              }}
            >
              <ListItemBody>
                <ListItemText>Reminder</ListItemText>
                <ListItemMeta>
                  {opts.find((o) => o.value === reminderValue)?.label ?? '—'}
                </ListItemMeta>
              </ListItemBody>
              {ListItemActions && SelectBox && (
                <ListItemActions>
                  <SelectBox
                    options={opts}
                    value={reminderValue}
                    open={activeSelect === 'reminder'}
                    focusedIndex={activeSelect === 'reminder' ? selectFocused : 0}
                    onSelect={(val: string) => {
                      setReminderValue(val)
                      setActiveSelect(null)
                    }}
                    onClose={() => setActiveSelect(null)}
                    onOpen={(startIdx: number) => {
                      setSelectFocused(startIdx)
                      setActiveSelect('reminder')
                    }}
                  />
                </ListItemActions>
              )}
            </ListItem>
          </List>
        )}
      </div>
    )
  }

  return null
}
