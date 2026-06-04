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
  t: (key: string) => string
}

export function StoreExtensionList({
  extensions,
  selectedIndex,
  focusArea,
  error,
  onSelect,
  onItemSelected,
  setFocusArea,
  t,
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
    <ScrollArea
      style={{ flex: 1, borderRight: '1px solid var(--border-color, rgba(255,255,255,0.1))' }}
    >
      {error && Alert && (
        <Alert variant="danger" style={{ margin: 'var(--space-2)' }}>
          {error}
        </Alert>
      )}

      {extensions.length === 0 ? (
        <EmptyState message={t('list.empty')} />
      ) : (
        List && (
          <List>
            {extensions.map((ext, idx) => {
              const isActive = focusArea === 'right' && idx === selectedIndex
              const versionText = ext.canUpdate
                ? `v${ext.installedVersion} → v${ext.version}`
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                        <ListItemText style={{ fontWeight: 'bold' }}>{ext.name}</ListItemText>
                        {ext.installed && !ext.canUpdate && Badge && (
                          <Badge
                            variant="success"
                            style={{ fontSize: '0.65em', padding: '1px 5px' }}
                          >
                            {t('badge.installed')}
                          </Badge>
                        )}
                      </div>
                      <span style={{ fontSize: '0.75em', opacity: 0.6 }}>{ext.description}</span>
                    </ListItemBody>
                    {ListItemMeta && (
                      <ListItemMeta
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                      >
                        <span style={{ fontSize: '0.8em', opacity: 0.5 }}>{versionText}</span>
                        {ext.canUpdate && Badge && (
                          <Badge variant="warning">{t('badge.update')}</Badge>
                        )}
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
