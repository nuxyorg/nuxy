const React = window.React

import type { ProcessInfo } from '../types.ts'

interface Props {
  processes: ProcessInfo[]
  selectedIndex: number
  onSelect: (idx: number) => void
  emptyMessage: string
  emptyHint: string
}

export function ProcessList({
  processes,
  selectedIndex,
  onSelect,
  emptyMessage,
  emptyHint,
}: Props) {
  const { List, ListItem, ListItemBody, ListItemText, ListItemMeta, EmptyState } = window.UI || {}

  if (processes.length === 0) {
    return EmptyState ? <EmptyState message={emptyMessage} hint={emptyHint} /> : null
  }

  if (!List) return null

  return (
    <List>
      {processes.map((proc, idx) => (
        <ListItem key={proc.pid} active={idx === selectedIndex} onClick={() => onSelect(idx)}>
          <ListItemBody>
            <ListItemText>{proc.name}</ListItemText>
            <ListItemMeta>
              {proc.pid} | {proc.cpu}% | {proc.mem}%
            </ListItemMeta>
          </ListItemBody>
        </ListItem>
      ))}
    </List>
  )
}
