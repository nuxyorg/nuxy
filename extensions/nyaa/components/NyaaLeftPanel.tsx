const React = window.React

import type { NyaaResult } from '../types.ts'

interface Props {
  results: NyaaResult[]
  loading: boolean
  error: string | null
  query: string
  selectedIndex: number
  copiedId: string | null
  onSelect: (index: number) => void
}

export function NyaaLeftPanel({ results, loading, error, query, selectedIndex, copiedId, onSelect }: Props) {
  const { List, ListItem, ListItemBody, ListItemText, ListItemMeta, EmptyState, Alert } = window.UI || {}

  if (!query.trim()) {
    return EmptyState ? (
      <EmptyState message="Search nyaa.si" hint="Type a title to search for torrents." />
    ) : (
      <div style={{ padding: 'var(--space-5)', opacity: 0.5, fontSize: 'var(--font-sm)' }}>
        Type a title to search for torrents.
      </div>
    )
  }

  if (loading) {
    return EmptyState ? (
      <EmptyState message="Searching..." hint={`Fetching results from nyaa.si`} />
    ) : (
      <div style={{ padding: 'var(--space-5)', opacity: 0.5, fontSize: 'var(--font-sm)' }}>Searching...</div>
    )
  }

  if (error) {
    return Alert ? (
      <Alert variant="error">{error}</Alert>
    ) : (
      <div style={{ padding: 'var(--space-5)', color: 'var(--color-danger)', fontSize: 'var(--font-sm)' }}>
        {error}
      </div>
    )
  }

  if (results.length === 0) {
    return EmptyState ? (
      <EmptyState message="No results." hint={`Nothing found for "${query}"`} />
    ) : (
      <div style={{ padding: 'var(--space-5)', opacity: 0.5, fontSize: 'var(--font-sm)' }}>No results found.</div>
    )
  }

  return List ? (
    <List>
      {results.map((item, idx) => {
        const isActive = idx === selectedIndex
        const isCopied = copiedId === item.id
        const textVariant =
          isCopied ? 'success' : item.status === 'success' ? 'success' : item.status === 'danger' ? 'error' : 'default'

        return (
          <ListItem key={item.id} active={isActive} onClick={() => onSelect(idx)}>
            <ListItemBody>
              <ListItemText variant={textVariant}>{isCopied ? 'Copied!' : item.title}</ListItemText>
              <ListItemMeta>
                {item.seeds}S / {item.leeches}L · {item.size}
              </ListItemMeta>
            </ListItemBody>
          </ListItem>
        )
      })}
    </List>
  ) : null
}
