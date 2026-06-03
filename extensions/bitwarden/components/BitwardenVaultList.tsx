const React = window.React

import type { BitwardenItem } from '../types.ts'

interface Props {
  results: BitwardenItem[]
  query: string
  selectedIndex: number
}

export function BitwardenVaultList({ results, query, selectedIndex }: Props) {
  const { List, ListItem, ListItemBody, ListItemText, ListItemMeta, EmptyState } = window.UI || {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {List ? (
          <List>
            {results.length === 0 ? (
              <EmptyState
                message={query ? 'Sonuç bulunamadı.' : 'Aramak istediğiniz şifre adını yazın.'}
              />
            ) : (
              results.map((item, idx) => (
                <ListItem key={item.id} active={idx === selectedIndex}>
                  <ListItemBody>
                    <ListItemText>{item.name}</ListItemText>
                    <ListItemMeta>{item.username}</ListItemMeta>
                  </ListItemBody>
                </ListItem>
              ))
            )}
          </List>
        ) : null}
      </div>
    </div>
  )
}
