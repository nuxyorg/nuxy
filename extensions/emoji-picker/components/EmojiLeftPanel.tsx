const React = window.React

import type { EmojiCategory } from '../types.ts'

interface Props {
  allCategories: EmojiCategory[]
  catId: string | null
  onCategorySelect: (id: string) => void
}

export function EmojiLeftPanel({ allCategories, catId, onCategorySelect }: Props) {
  const { TabBar, List, ListItem, ListItemBody, ListItemText, ItemLeading, IconStar } =
    window.UI || {}

  if (TabBar) {
    return (
      <TabBar
        orientation="vertical"
        style={{ borderRight: 'none', height: '100%' }}
        tabs={allCategories.map((c) => ({ id: c.id, label: c.label, icon: c.icon }))}
        active={catId}
        onChange={onCategorySelect}
      />
    )
  }

  return (
    <List>
      {allCategories.map((cat) => (
        <ListItem key={cat.id} active={cat.id === catId} onClick={() => onCategorySelect(cat.id)}>
          <ItemLeading>
            {cat.id === 'favorites' && IconStar ? (
              <IconStar style={{ width: 'var(--icon-sm)', height: 'var(--icon-sm)' }} />
            ) : (
              cat.icon
            )}
          </ItemLeading>
          <ListItemBody>
            <ListItemText>{cat.label}</ListItemText>
          </ListItemBody>
        </ListItem>
      ))}
    </List>
  )
}
