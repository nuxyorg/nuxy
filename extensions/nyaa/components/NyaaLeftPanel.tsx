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
  multiSelectMode: boolean
  checkedIds: Set<string>
  onToggleCheck: (id: string) => void
  t: (key: string) => string
}

export function NyaaLeftPanel({
  results,
  loading,
  error,
  query,
  selectedIndex,
  copiedId,
  onSelect,
  multiSelectMode,
  checkedIds,
  onToggleCheck,
  t,
}: Props) {
  const { List, ListItem, ListItemBody, ListItemText, ListItemMeta, EmptyState, Alert } =
    window.UI || {}

  if (!query.trim()) {
    return EmptyState ? (
      <EmptyState message={t('search.empty.message')} hint={t('search.empty.hint')} />
    ) : (
      <div style={{ padding: 'var(--space-5)', opacity: 0.5, fontSize: 'var(--font-sm)' }}>
        {t('search.empty.hint')}
      </div>
    )
  }

  if (loading) {
    return EmptyState ? (
      <EmptyState message={t('search.loading.message')} hint={t('search.loading.hint')} />
    ) : (
      <div style={{ padding: 'var(--space-5)', opacity: 0.5, fontSize: 'var(--font-sm)' }}>
        {t('search.loading.message')}
      </div>
    )
  }

  if (error) {
    return Alert ? (
      <Alert variant="error">{error}</Alert>
    ) : (
      <div
        style={{
          padding: 'var(--space-5)',
          color: 'var(--color-danger)',
          fontSize: 'var(--font-sm)',
        }}
      >
        {error}
      </div>
    )
  }

  if (results.length === 0) {
    return EmptyState ? (
      <EmptyState message={t('search.noResults.message')} hint={t('search.noResults.hint')} />
    ) : (
      <div style={{ padding: 'var(--space-5)', opacity: 0.5, fontSize: 'var(--font-sm)' }}>
        {t('search.noResults.message')}
      </div>
    )
  }

  return List ? (
    <List>
      {results.map((item, idx) => {
        const isActive = idx === selectedIndex
        const isCopied = copiedId === item.id
        const isChecked = checkedIds.has(item.id)
        const textVariant = isCopied
          ? 'success'
          : item.status === 'success'
            ? 'success'
            : item.status === 'danger'
              ? 'error'
              : 'default'

        const handleClick = () => {
          if (multiSelectMode) {
            onToggleCheck(item.id)
          } else {
            onSelect(idx)
          }
        }

        return (
          <ListItem key={item.id} active={isActive} onClick={handleClick}>
            {multiSelectMode && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  paddingRight: 'var(--space-2)',
                  flexShrink: 0,
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleCheck(item.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '14px',
                    height: '14px',
                    cursor: 'pointer',
                    accentColor: 'var(--color-accent, var(--color-primary))',
                    flexShrink: 0,
                  }}
                  aria-label={item.title}
                />
              </div>
            )}
            <ListItemBody>
              <ListItemText variant={textVariant}>
                {isCopied ? t('item.copied') : item.title}
              </ListItemText>
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
