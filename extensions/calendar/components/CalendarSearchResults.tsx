const React = window.React

import type { CalendarEvent } from '../types.ts'

interface Props {
  filteredSearch: CalendarEvent[]
  listIdx: number
  onSelectEvent: (evt: CalendarEvent) => void
}

export function CalendarSearchResults({ filteredSearch, listIdx, onSelectEvent }: Props) {
  const {
    List,
    ListItem,
    ListItemBody,
    ListItemText,
    ListItemMeta,
    ListItemActions,
    EmptyState,
    Icon,
  } = window.UI || {}

  return (
    <div style={{ height: '100%' }}>
      {filteredSearch.length === 0
        ? EmptyState && <EmptyState message="No events found" hint="Try a different search." />
        : List && (
            <List>
              {filteredSearch.map((evt, idx) => (
                <ListItem key={evt.id} active={idx === listIdx} onClick={() => onSelectEvent(evt)}>
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
                  {evt.remindMin > 0 && Icon && ListItemActions && (
                    <ListItemActions>
                      <Icon
                        name="Bell"
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
