const React = window.React

import type { CalendarEvent } from '../types.ts'
import { REMINDER_OPTIONS, getOptionLabel, getInitialFocusIndex } from '../utils/eventOptions.ts'

interface Props {
  editingEvent: CalendarEvent
  reminderValue: string
  activeSelect: string | null
  selectFocused: number
  onSetSelectFocused: (idx: number) => void
  onSetActiveSelect: (field: string | null) => void
  onSetReminderValue: (val: string) => void
}

export function CalendarDetailView({
  editingEvent,
  reminderValue,
  activeSelect,
  selectFocused,
  onSetSelectFocused,
  onSetActiveSelect,
  onSetReminderValue,
}: Props) {
  const { List, ListItem, ListItemBody, ListItemText, ListItemMeta, ListItemActions, SelectBox } =
    window.UI || {}

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
              onSetSelectFocused(getInitialFocusIndex(opts, reminderValue))
              onSetActiveSelect('reminder')
            }}
          >
            <ListItemBody>
              <ListItemText>Reminder</ListItemText>
              <ListItemMeta>{getOptionLabel(opts, reminderValue)}</ListItemMeta>
            </ListItemBody>
            {ListItemActions && SelectBox && (
              <ListItemActions>
                <SelectBox
                  options={opts}
                  value={reminderValue}
                  open={activeSelect === 'reminder'}
                  focusedIndex={activeSelect === 'reminder' ? selectFocused : 0}
                  onSelect={(val: string) => {
                    onSetReminderValue(val)
                    onSetActiveSelect(null)
                  }}
                  onClose={() => onSetActiveSelect(null)}
                  onOpen={(startIdx: number) => {
                    onSetSelectFocused(startIdx)
                    onSetActiveSelect('reminder')
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
