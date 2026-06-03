const React = window.React

const EXT_ID = 'com.nuxy.converter'

import type { ConversionResult } from './types.ts'
import { useConverterData } from './hooks/useConverterData.ts'
import { useConverterActions } from './hooks/useConverterActions.ts'
import { useConverterKeyboard } from './hooks/useConverterKeyboard.ts'
import { ConverterList } from './components/ConverterList.tsx'

interface Props {
  query: string
}

export default function ConverterView({ query }: Props) {
  const { EmptyState } = window.UI || {}

  const _useTranslation =
    (window.UI || {}).useTranslation ||
    (() => ({ t: (k: string) => k, dir: 'ltr' as const }))

  const { t, dir } = _useTranslation(EXT_ID)

  const { results, loading } = useConverterData(query)
  const { copiedId, handleCopy } = useConverterActions()
  const { selectedIndex, setSelectedIndex } = useConverterKeyboard({
    results,
    handleCopy,
    enterLabel: t('actions.copy'),
  })

  const currentQuery = query || ''
  const isEmpty = !currentQuery.trim()
  const hasResults = results.length > 0

  const emptyMessage = isEmpty ? t('empty') : loading ? '...' : t('noResults')
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
        <ConverterList
          results={results}
          selectedIndex={selectedIndex}
          copiedId={copiedId}
          copiedLabel={t('copied')}
          onSelect={setSelectedIndex}
        />
      )}
    </div>
  )
}
