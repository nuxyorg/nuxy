const React = window.React

import type { CalendarEvent } from '../types.ts'

interface Props {
  calYear: number
  calMonth: number
  selectedDay: number
  dayEvents: CalendarEvent[]
  listIdx: number
}

export function CalendarDayView({ calYear, calMonth, selectedDay, dayEvents, listIdx }: Props) {
  const { List, ListItem, ListItemBody, ListItemText, ListItemMeta, ListItemActions, EmptyState, IconBell } =
    window.UI || {}

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
        ? EmptyState && <EmptyState message="No events" hint="Press N to create an event." />
        : List && (
            <List>
              {dayEvents.map((evt, idx) => (
                <ListItem key={evt.id} active={idx === listIdx}>
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
                        style={{
                          width: '14px',
                          height: '14px',
                          color: 'var(--color-warning, #eab308)',
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
