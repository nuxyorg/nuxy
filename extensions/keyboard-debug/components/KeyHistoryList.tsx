const React = window.React

import type { KeyEvent } from '../types.ts'

interface Props {
  filteredHistory: KeyEvent[]
  selectedIndex: number
  emptyLabel: string
  emptyHint: string
  searchQuery: string
}

function formatCombo(event: KeyEvent): string {
  const keyName = event.key === ' ' ? 'Space' : event.key
  return [...event.modifiers, keyName].join('+')
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 1000) return `${diff}ms`
  return `${(diff / 1000).toFixed(1)}s`
}

export function KeyHistoryList({
  filteredHistory,
  selectedIndex,
  emptyLabel,
  emptyHint,
  searchQuery,
}: Props) {
  const { List, ListItem, ListItemBody, ListItemText, ListItemMeta, EmptyState } = window.UI || {}

  if (!List || !ListItem || !ListItemBody || !ListItemText) return null

  return (
    <List>
      {filteredHistory.length === 0 ? (
        EmptyState ? (
          <EmptyState
            message={searchQuery.trim() ? 'No matches.' : emptyLabel}
            hint={searchQuery.trim() ? 'Try a different filter.' : emptyHint}
          />
        ) : null
      ) : (
        filteredHistory.map((event, idx) => (
          <ListItem key={event.id} active={idx === selectedIndex}>
            <ListItemBody>
              <ListItemText>{formatCombo(event)}</ListItemText>
              {ListItemMeta && (
                <ListItemMeta>
                  {event.code} · {timeAgo(event.timestamp)}
                </ListItemMeta>
              )}
            </ListItemBody>
          </ListItem>
        ))
      )}
    </List>
  )
}
