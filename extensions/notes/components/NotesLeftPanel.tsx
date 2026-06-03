const React = window.React

import type { Note } from '../types.ts'

interface Props {
  filteredNotes: Note[]
  selectedIndex: number
  query: string
  onSelect: (index: number) => void
}

export function NotesLeftPanel({ filteredNotes, selectedIndex, query, onSelect }: Props) {
  const { List, ListItem, ListItemBody, ListItemText, ListItemMeta, EmptyState, SectionHeader } =
    window.UI || {}

  return (
    <>
      {SectionHeader && <SectionHeader label="Notes" />}
      <List>
        <ListItem active={selectedIndex === 0} onClick={() => onSelect(0)}>
          <ListItemBody>
            <ListItemText>New Note</ListItemText>
            <ListItemMeta>Create a new note</ListItemMeta>
          </ListItemBody>
        </ListItem>
        {filteredNotes.length === 0 ? (
          <EmptyState
            message={query ? 'No matching notes.' : 'No notes yet.'}
            hint="Use ⌃N to create a new note."
          />
        ) : (
          filteredNotes.map((note, idx) => (
            <ListItem
              key={note.id}
              active={idx + 1 === selectedIndex}
              onClick={() => onSelect(idx + 1)}
            >
              <ListItemBody>
                <ListItemText>{note.title}</ListItemText>
                <ListItemMeta>{note.body.slice(0, 60)}</ListItemMeta>
              </ListItemBody>
            </ListItem>
          ))
        )}
      </List>
    </>
  )
}
