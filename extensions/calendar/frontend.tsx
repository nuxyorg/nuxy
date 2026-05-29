const React = window.React
const { useState, useEffect, useMemo, useRef } = React
const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

const EXT_ID = 'com.nuxy.calendar'
const FORM_FIELDS = ['date', 'time', 'reminder']

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

function makeDateOptions(): SelectOption[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const ms = today.getTime()
  return [
    { value: String(ms), label: 'Today' },
    { value: String(ms + 86400000), label: 'Tomorrow' },
    { value: String(ms + 2 * 86400000), label: 'In 2 days' },
    { value: String(ms + 3 * 86400000), label: 'In 3 days' },
    { value: String(ms + 7 * 86400000), label: 'Next week' },
  ]
}

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

function formatDisplay(ts: number): string {
  if (!ts) return ''
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function computeDatetime(dateValueStr: string, timeValueStr: string): number {
  const d = new Date(parseInt(dateValueStr, 10))
  d.setHours(parseInt(timeValueStr, 10), 0, 0, 0)
  return d.getTime()
}

function ipcCall(channel: string, payload: unknown): Promise<unknown> {
  return window.core.ipc.invoke(EXT_ID, channel, payload).then((res) => {
    const r = res as { success: boolean; error?: string; data?: unknown } | null
    if (!r?.success) throw new Error(r?.error || 'IPC failed')
    return r.data
  })
}

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
  } = window.UI || {}

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list')
  const [listIdx, setListIdx] = useState(-1)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)

  const dateOptions = useMemo(() => makeDateOptions(), [])
  const [dateValue, setDateValue] = useState<string>(() => dateOptions[0].value)
  const [timeValue, setTimeValue] = useState('10')
  const [reminderValue, setReminderValue] = useState('0')
  const [formFieldIdx, setFormFieldIdx] = useState(0)

  const [activeSelect, setActiveSelect] = useState<string | null>(null)
  const [selectFocused, setSelectFocused] = useState(0)

  const stateRef = useRef<{
    view: 'list' | 'create' | 'detail'
    listIdx: number
    editingEvent: CalendarEvent | null
    filteredEvents: CalendarEvent[]
    dateValue: string
    timeValue: string
    reminderValue: string
    formFieldIdx: number
    activeSelect: string | null
    selectFocused: number
  }>({} as ReturnType<typeof stateRef.current>)

  function loadEvents(): void {
    const from = Date.now()
    const to = from + 7 * 24 * 60 * 60 * 1000
    ipcCall('calendar:list', { from, to })
      .then((evts) => setEvents((evts as CalendarEvent[]) || []))
      .catch(() => {})
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const filteredEvents = useMemo(() => {
    const q = (query || '').trim().toLowerCase()
    return q ? events.filter((e) => e.title.toLowerCase().includes(q)) : events
  }, [events, query])

  stateRef.current = {
    view,
    listIdx,
    editingEvent,
    filteredEvents,
    dateValue,
    timeValue,
    reminderValue,
    formFieldIdx,
    activeSelect,
    selectFocused,
  }

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [view, listIdx, activeSelect, formFieldIdx])

  function enterCreate(): void {
    setDateValue(dateOptions[0].value)
    setTimeValue('10')
    setReminderValue('0')
    setFormFieldIdx(0)
    setActiveSelect(null)
    setView('create')
  }

  function enterDetail(evt: CalendarEvent): void {
    setEditingEvent(evt)
    setReminderValue(String(evt.remindMin))
    setFormFieldIdx(0)
    setActiveSelect(null)
    setView('detail')
  }

  function backToList(): void {
    setView('list')
    setEditingEvent(null)
    setListIdx(-1)
    setActiveSelect(null)
  }

  function getFieldOptions(field: string): SelectOption[] {
    if (field === 'date') return dateOptions
    if (field === 'time') return TIME_OPTIONS
    return REMINDER_OPTIONS
  }

  function getFieldCurrentValue(field: string): string {
    const s = stateRef.current
    if (field === 'date') return s.dateValue
    if (field === 'time') return s.timeValue
    return s.reminderValue
  }

  function setFieldValue(field: string, val: string): void {
    if (field === 'date') setDateValue(val)
    else if (field === 'time') setTimeValue(val)
    else setReminderValue(val)
  }

  _useToolKeyActions([
    {
      key: 'ArrowUp',
      label: 'Navigate',
      hint: '↑↓',
      activeOn: () => {
        const { view } = stateRef.current
        return view === 'list' || view === 'create' || view === 'detail'
      },
      handler: () => {
        const { view, activeSelect, listIdx, formFieldIdx } = stateRef.current
        if (activeSelect !== null) {
          setSelectFocused((i) => Math.max(0, i - 1))
        } else if (view === 'list') {
          setListIdx((i) => Math.max(-1, i - 1))
        } else {
          setFormFieldIdx((i) => Math.max(0, i - 1))
        }
      },
    },
    {
      key: 'ArrowDown',
      label: '',
      activeOn: () => {
        const { view } = stateRef.current
        return view === 'list' || view === 'create' || view === 'detail'
      },
      handler: () => {
        const { view, activeSelect, filteredEvents, formFieldIdx } = stateRef.current
        if (activeSelect !== null) {
          const opts = getFieldOptions(activeSelect)
          setSelectFocused((i) => Math.min(opts.length - 1, i + 1))
        } else if (view === 'list') {
          setListIdx((i) => Math.min(filteredEvents.length - 1, i + 1))
        } else {
          const fields = view === 'detail' ? ['reminder'] : FORM_FIELDS
          setFormFieldIdx((i) => Math.min(fields.length - 1, i + 1))
        }
      },
    },
    {
      key: 'Enter',
      label: view === 'list' ? 'Open' : activeSelect !== null ? 'Confirm' : 'Select',
      hint: '↵',
      activeOn: () => {
        const s = stateRef.current
        if (s.view === 'list') return s.listIdx >= 0 && s.listIdx < s.filteredEvents.length
        return s.view === 'create' || s.view === 'detail'
      },
      handler: () => {
        const s = stateRef.current
        if (s.view === 'list') {
          const evt = s.filteredEvents[s.listIdx]
          if (evt) enterDetail(evt)
          return
        }
        if (s.activeSelect !== null) {
          const opts = getFieldOptions(s.activeSelect)
          const opt = opts[s.selectFocused]
          if (opt) setFieldValue(s.activeSelect, opt.value)
          setActiveSelect(null)
          const fields = s.view === 'detail' ? ['reminder'] : FORM_FIELDS
          const fieldIdx = fields.indexOf(s.activeSelect)
          if (fieldIdx < fields.length - 1) setFormFieldIdx(fieldIdx + 1)
        } else {
          const fields = s.view === 'detail' ? ['reminder'] : FORM_FIELDS
          const field = fields[s.formFieldIdx]
          if (!field) return
          const opts = getFieldOptions(field)
          const currentVal = getFieldCurrentValue(field)
          setSelectFocused(
            Math.max(
              0,
              opts.findIndex((o) => o.value === currentVal)
            )
          )
          setActiveSelect(field)
        }
      },
    },
    {
      key: 'n',
      label: 'New Event',
      hint: 'N',
      activeOn: () => stateRef.current.view === 'list',
      handler: enterCreate,
    },
    {
      key: 'd',
      label: 'Delete',
      hint: 'D',
      activeOn: () => {
        const s = stateRef.current
        return (
          (s.view === 'list' && s.listIdx >= 0 && s.listIdx < s.filteredEvents.length) ||
          (s.view === 'detail' && s.editingEvent != null)
        )
      },
      handler: () => {
        const s = stateRef.current
        const id = s.view === 'list' ? s.filteredEvents[s.listIdx]?.id : s.editingEvent?.id
        if (!id) return
        ipcCall('calendar:delete', { id })
          .then(() => {
            loadEvents()
            backToList()
          })
          .catch(() => {})
      },
    },
    {
      key: 's',
      label: 'Save',
      hint: 'S',
      activeOn: () => {
        const s = stateRef.current
        return (s.view === 'create' || s.view === 'detail') && s.activeSelect === null
      },
      handler: () => {
        const s = stateRef.current
        if (s.view === 'create') {
          const title = (query || '').trim()
          if (!title) return
          ipcCall('calendar:create', {
            title,
            datetime: computeDatetime(s.dateValue, s.timeValue),
            notes: '',
            remindMin: parseInt(s.reminderValue, 10),
          })
            .then(() => {
              loadEvents()
              backToList()
            })
            .catch(() => {})
        } else if (s.view === 'detail' && s.editingEvent) {
          ipcCall('calendar:update', {
            id: s.editingEvent.id,
            remindMin: parseInt(s.reminderValue, 10),
          })
            .then(() => {
              loadEvents()
              backToList()
            })
            .catch(() => {})
        }
      },
    },
    {
      key: 'Escape',
      label: 'Back',
      hint: 'Esc',
      activeOn: () => {
        const { view } = stateRef.current
        return view === 'create' || view === 'detail'
      },
      handler: backToList,
    },
  ])

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  // ── List view ───────────────────────────────────────────────────────────────

  if (view === 'list') {
    return (
      <div>
        <div
          style={{
            padding: 'var(--space-3) var(--space-4) var(--space-1)',
            opacity: 0.55,
            fontSize: 'var(--font-sm)',
          }}
        >
          {todayLabel}
        </div>
        {filteredEvents.length === 0
          ? EmptyState && (
              <EmptyState
                message="No upcoming events"
                hint={
                  (query || '').trim()
                    ? 'No events match your search.'
                    : 'Press N to create an event.'
                }
              />
            )
          : List && (
              <List>
                {filteredEvents.map((evt, idx) => (
                  <ListItem key={evt.id} active={idx === listIdx} onClick={() => enterDetail(evt)}>
                    <ListItemBody>
                      <ListItemText>{evt.title}</ListItemText>
                      <ListItemMeta>{formatDisplay(evt.datetime)}</ListItemMeta>
                    </ListItemBody>
                    {evt.remindMin > 0 && IconBell && ListItemActions && (
                      <ListItemActions>
                        <IconBell
                          style={{
                            width: '14px',
                            height: '14px',
                            color: 'var(--color-warning)',
                          }}
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

  // ── Create view ─────────────────────────────────────────────────────────────

  if (view === 'create') {
    const title = (query || '').trim()
    const fieldLabel: Record<string, string> = { date: 'Date', time: 'Time', reminder: 'Reminder' }
    const fieldCurrentValues: Record<string, string> = {
      date: dateValue,
      time: timeValue,
      reminder: reminderValue,
    }

    return (
      <div>
        <div
          style={{
            padding: 'var(--space-3) var(--space-4) var(--space-1)',
            opacity: 0.55,
            fontSize: 'var(--font-sm)',
          }}
        >
          {title ? `New: "${title}"` : 'Type event title in the search bar'}
        </div>
        {List && (
          <List>
            {FORM_FIELDS.map((field, idx) => {
              const opts = getFieldOptions(field)
              const currentVal = fieldCurrentValues[field]
              const isFieldFocused = idx === formFieldIdx && activeSelect === null
              return (
                <ListItem
                  key={field}
                  active={isFieldFocused}
                  onClick={() => {
                    setFormFieldIdx(idx)
                    setSelectFocused(
                      Math.max(
                        0,
                        opts.findIndex((o) => o.value === currentVal)
                      )
                    )
                    setActiveSelect(field)
                  }}
                >
                  <ListItemBody>
                    <ListItemText>{fieldLabel[field]}</ListItemText>
                    <ListItemMeta>
                      {opts.find((o) => o.value === currentVal)?.label ?? '—'}
                    </ListItemMeta>
                  </ListItemBody>
                  {ListItemActions && SelectBox && (
                    <ListItemActions>
                      <SelectBox
                        options={opts}
                        value={currentVal}
                        open={activeSelect === field}
                        focusedIndex={activeSelect === field ? selectFocused : 0}
                        onSelect={(val: string) => {
                          setFieldValue(field, val)
                          setActiveSelect(null)
                          if (idx < FORM_FIELDS.length - 1) setFormFieldIdx(idx + 1)
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

  // ── Detail view ─────────────────────────────────────────────────────────────

  if (view === 'detail' && editingEvent) {
    const opts = REMINDER_OPTIONS
    return (
      <div>
        <div style={{ padding: 'var(--space-3) var(--space-4) var(--space-1)' }}>
          <div style={{ fontWeight: 600, fontSize: 'var(--font-base)' }}>{editingEvent.title}</div>
          <div
            style={{
              fontSize: 'var(--font-sm)',
              opacity: 0.55,
              marginTop: 'var(--space-1)',
            }}
          >
            {formatDisplay(editingEvent.datetime)}
          </div>
        </div>
        {List && (
          <List>
            <ListItem
              active={activeSelect === null}
              onClick={() => {
                setSelectFocused(
                  Math.max(
                    0,
                    opts.findIndex((o) => o.value === reminderValue)
                  )
                )
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
