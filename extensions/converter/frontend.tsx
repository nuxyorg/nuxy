const React = window.React
const { useState, useEffect } = React

import type { ConversionResult } from './types.ts'

const EXT_ID = 'com.nuxy.converter'

interface Props {
  query: string
}

export default function ConverterView({ query }: Props) {
  const {
    List,
    ListItem,
    ListItemBody,
    ListItemText,
    ListItemMeta,
    EmptyState,
  } = window.UI || {}

  const _useListNavigation =
    (window.UI || {}).useListNavigation ||
    (() => ({ selectedIndex: -1, setSelectedIndex: () => {} }))

  const _useTranslation =
    (window.UI || {}).useTranslation ||
    (() => ({ t: (k: string) => k, dir: 'ltr' as const }))

  const { t, dir } = _useTranslation(EXT_ID)
  const [results, setResults] = useState<ConversionResult[]>([])
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = (item: ConversionResult): void => {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'copyResult', { value: item.formattedResult })
      .then(() => {
        setCopiedId(item.id)
        setTimeout(() => setCopiedId(null), 1800)
      })
      .catch(() => {})
  }

  const { selectedIndex, setSelectedIndex } = _useListNavigation(results, {
    onEnter: (item: ConversionResult) => handleCopy(item),
    enterLabel: t('actions.copy'),
    enterHint: '↵',
  })

  // Dispatch nuxy-key-hints-changed when selectedIndex changes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [selectedIndex])

  // Debounce query and call convert IPC
  useEffect(() => {
    const q = query || ''
    if (!q.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    const timer = setTimeout(() => {
      if (!window.core?.ipc?.invoke) {
        setLoading(false)
        return
      }
      window.core.ipc
        .invoke(EXT_ID, 'convert', { query: q })
        .then((res: unknown) => {
          setLoading(false)
          const r = res as { success: boolean; data?: ConversionResult[] } | null
          if (r?.success && Array.isArray(r.data)) {
            setResults(r.data)
          } else {
            setResults([])
          }
        })
        .catch(() => {
          setLoading(false)
          setResults([])
        })
    }, 120)

    return () => clearTimeout(timer)
  }, [query])

  const currentQuery = query || ''
  const isEmpty = !currentQuery.trim()
  const hasResults = results.length > 0

  const emptyMessage = isEmpty
    ? t('empty')
    : loading
      ? '...'
      : t('noResults')

  const emptyHint = isEmpty ? t('emptyHint') : t('noResultsHint')

  return (
    <div style={{ direction: dir }}>
      {!hasResults ? (
        EmptyState ? (
          <EmptyState message={emptyMessage} hint={emptyHint} />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--space-8, 32px) var(--space-4, 16px)',
              opacity: 0.5,
              gap: 'var(--space-2, 8px)',
              fontSize: 'var(--font-sm, 13px)',
              color: 'var(--text-secondary)',
              textAlign: 'center',
            }}
          >
            <div>{emptyMessage}</div>
            <div style={{ opacity: 0.6, fontSize: 'var(--font-xs, 11px)' }}>{emptyHint}</div>
          </div>
        )
      ) : (
        List && (
          <List>
            {results.map((r, idx) => {
              const isCopied = copiedId === r.id
              const isActive = idx === selectedIndex
              const displayText = isCopied ? t('copied') : r.formattedResult
              return (
                ListItem && (
                  <ListItem
                    key={r.id}
                    active={isActive}
                    onClick={() => setSelectedIndex(idx)}
                  >
                    {ListItemBody && (
                      <ListItemBody>
                        {ListItemText && (
                          <ListItemText variant={isCopied ? 'success' : 'default'}>
                            {displayText}
                          </ListItemText>
                        )}
                        {ListItemMeta && (
                          <ListItemMeta>
                            {r.fromValue} {r.fromSymbol} → {r.toSymbol}
                          </ListItemMeta>
                        )}
                      </ListItemBody>
                    )}
                  </ListItem>
                )
              )
            })}
          </List>
        )
      )}
    </div>
  )
}
