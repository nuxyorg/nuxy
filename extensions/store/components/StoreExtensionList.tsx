const React = window.React

import type { ExtensionListItem } from '../types.ts'

interface Props {
  extensions: ExtensionListItem[]
  selectedIndex: number
  focusArea: 'left' | 'right'
  error: string | null
  onSelect: (idx: number) => void
  onItemSelected: (idx: number) => void
  setFocusArea: (area: 'left' | 'right') => void
}

export function StoreExtensionList({
  extensions,
  selectedIndex,
  focusArea,
  error,
  onSelect,
  onItemSelected,
  setFocusArea,
}: Props) {
  const {
    List,
    ListItem,
    ListItemBody,
    ListItemText,
    ListItemMeta,
    EmptyState,
    Alert,
    Badge,
    ScrollArea,
  } = window.UI || {}

  return (
    <ScrollArea style={{ flex: 1, borderRight: '1px solid var(--border-color, rgba(255,255,255,0.1))' }}>
      {error && Alert && (
        <Alert variant="danger" style={{ margin: 'var(--space-2)' }}>
          {error}
        </Alert>
      )}

      {extensions.length === 0 ? (
        <EmptyState message="No extensions found." />
      ) : (
        List && (
          <List>
            {extensions.map((ext, idx) => {
              const isActive = focusArea === 'right' && idx === selectedIndex
              const statusText = ext.installed
                ? ext.canUpdate
                  ? `v${ext.installedVersion} (Update to v${ext.version})`
                  : `Installed v${ext.version}`
                : `v${ext.version}`

              return (
                ListItem && (
                  <ListItem
                    key={ext.id}
                    active={isActive}
                    onClick={() => {
                      onSelect(idx)
                      onItemSelected(idx)
                      setFocusArea('right')
                    }}
                  >
                    <ListItemBody>
                      <ListItemText style={{ fontWeight: 'bold' }}>{ext.name}</ListItemText>
                      <span style={{ fontSize: '0.75em', opacity: 0.6 }}>{ext.description}</span>
                    </ListItemBody>
                    {ListItemMeta && (
                      <ListItemMeta style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span style={{ fontSize: '0.8em', opacity: 0.5 }}>{statusText}</span>
                        {ext.canUpdate && Badge && <Badge variant="warning">Update</Badge>}
                        {ext.installed && !ext.canUpdate && Badge && <Badge variant="success">Installed</Badge>}
                      </ListItemMeta>
                    )}
                  </ListItem>
                )
              )
            })}
          </List>
        )
      )}
    </ScrollArea>
  )
}
