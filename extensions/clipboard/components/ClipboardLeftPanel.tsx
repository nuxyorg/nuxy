const React = window.React

import type { ClipboardItem } from '../types.ts'
import { getItemType, getListLabel, getListMeta } from '../utils/itemType.ts'
import { ClipboardItemLeading } from './ClipboardItemLeading.tsx'

interface Props {
  items: ClipboardItem[]
  allItems: ClipboardItem[]
  copiedId: string | null
  selectedIndex: number
  searchQuery: string
  onSelect: (index: number) => void
}

export function ClipboardLeftPanel({
  items,
  allItems,
  copiedId,
  selectedIndex,
  searchQuery,
  onSelect,
}: Props) {
  const { List, ListItem, ListItemBody, ListItemText, ListItemMeta, EmptyState, IconPin } =
    window.UI || {}

  return (
    <List>
      {items.length === 0 ? (
        <EmptyState
          message={searchQuery ? 'No matches.' : 'History is empty.'}
          hint={searchQuery ? 'Try a different search.' : 'Copied text will appear here.'}
        />
      ) : (
        items.map((item, idx) => {
          const isCopied = copiedId === item.id
          const isActive = idx === selectedIndex
          const isCurrent = allItems.length > 0 && item.id === allItems[0].id
          const type = getItemType(item)
          const label = getListLabel(item, type, isCopied)
          const meta = getListMeta(item, type, isCurrent)
          return (
            <ListItem key={item.id} active={isActive} onClick={() => onSelect(idx)}>
              <ClipboardItemLeading item={item} type={type} />
              <ListItemBody>
                <ListItemText variant={isCopied ? 'success' : 'default'}>
                  {item.pinned && IconPin && (
                    <IconPin size="14" style={{ marginRight: 'var(--space-2)', verticalAlign: 'middle' }} />
                  )}
                  {label}
                </ListItemText>
                <ListItemMeta>{meta}</ListItemMeta>
              </ListItemBody>
            </ListItem>
          )
        })
      )}
    </List>
  )
}
