const React = window.React

import { TIME_OPTIONS, REMINDER_OPTIONS, getOptionLabel, getInitialFocusIndex } from '../utils/eventOptions.ts'

// Only the select fields are keyboard-navigable (title comes from the omnibar query)
const CREATE_SELECT_FIELDS = ['time', 'reminder'] as const
type CreateSelectField = (typeof CREATE_SELECT_FIELDS)[number]

interface Props {
  calYear: number
  calMonth: number
  selectedDay: number
  query: string
  timeValue: string
  reminderValue: string
  formFieldIdx: number
  activeSelect: string | null
  selectFocused: number
  onSetFormFieldIdx: (idx: number) => void
  onSetSelectFocused: (idx: number) => void
  onSetActiveSelect: (field: string | null) => void
  onSetTimeValue: (val: string) => void
  onSetReminderValue: (val: string) => void
}

export function CalendarCreateForm({
  calYear,
  calMonth,
  selectedDay,
  query,
  timeValue,
  reminderValue,
  formFieldIdx,
  activeSelect,
  selectFocused,
  onSetFormFieldIdx,
  onSetSelectFocused,
  onSetActiveSelect,
  onSetTimeValue,
  onSetReminderValue,
}: Props) {
  const { List, ListItem, ListItemBody, ListItemText, ListItemMeta, ListItemActions, SelectBox } =
    window.UI || {}

  const dateLabel = new Date(calYear, calMonth, selectedDay).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const fieldCurrentValues: Record<string, string> = { time: timeValue, reminder: reminderValue }
  const fieldLabel: Record<string, string> = { time: 'Time', reminder: 'Reminder' }
  const fieldOptions = { time: TIME_OPTIONS, reminder: REMINDER_OPTIONS }

  function setSelectValue(field: string, val: string): void {
    if (field === 'time') onSetTimeValue(val)
    else onSetReminderValue(val)
  }

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
          {/* Title field — displays the current omnibar query as the event title */}
          <ListItem active={false}>
            <ListItemBody>
              <ListItemText>Title</ListItemText>
              <ListItemMeta>
                {query.trim() || (
                  <span style={{ opacity: 0.4 }}>Type in search bar…</span>
                )}
              </ListItemMeta>
            </ListItemBody>
          </ListItem>

          {/* Time and Reminder — SelectBox fields */}
          {CREATE_SELECT_FIELDS.map((field, idx) => {
            const opts = fieldOptions[field]
            const currentVal = fieldCurrentValues[field]
            const isFieldFocused = idx === formFieldIdx && activeSelect === null
            return (
              <ListItem
                key={field}
                active={isFieldFocused}
                onClick={() => {
                  onSetFormFieldIdx(idx)
                  onSetSelectFocused(getInitialFocusIndex(opts, currentVal))
                  onSetActiveSelect(field)
                }}
              >
                <ListItemBody>
                  <ListItemText>{fieldLabel[field]}</ListItemText>
                  <ListItemMeta>{getOptionLabel(opts, currentVal)}</ListItemMeta>
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
                        onSetActiveSelect(null)
                        if (idx < CREATE_SELECT_FIELDS.length - 1) onSetFormFieldIdx(idx + 1)
                      }}
                      onClose={() => onSetActiveSelect(null)}
                      onOpen={(startIdx: number) => {
                        onSetFormFieldIdx(idx)
                        onSetSelectFocused(startIdx)
                        onSetActiveSelect(field)
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
