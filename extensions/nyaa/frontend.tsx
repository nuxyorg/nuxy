const React = window.React
const { useState, useEffect, useCallback } = React

const EXT_ID = 'com.nuxy.nyaa'
const _useTranslation =
  (window.UI || {}).useTranslation ||
  (() => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' as const }))

import type { NyaaResult } from './types.ts'
import { useNyaaSearch } from './hooks/useNyaaSearch.ts'
import { useNyaaActions } from './hooks/useNyaaActions.ts'
import { useNyaaKeyboard } from './hooks/useNyaaKeyboard.ts'
import { NyaaLeftPanel } from './components/NyaaLeftPanel.tsx'
import { NyaaRightPanel } from './components/NyaaRightPanel.tsx'

interface Props {
  query: string
}

export default function NyaaView({ query }: Props) {
  const { TwoPanel } = window.UI || {}
  const { t } = _useTranslation(EXT_ID)
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)
  const [multiSelectMode, setMultiSelectMode] = useState<boolean>(false)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())

  const { results, loading, error } = useNyaaSearch(query)

  useEffect(() => {
    setSelectedIndex(-1)
    // Exit multi-select and clear checks when query changes
    setMultiSelectMode(false)
    setCheckedIds(new Set())
  }, [query])

  const {
    copiedId,
    enterAction,
    handleCopyMagnet,
    handleDownloadTorrent,
    handleCopyMagnets,
    handleDownloadTorrents,
  } = useNyaaActions()

  const handleToggleCheck = useCallback((id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSetMultiSelectMode = useCallback((val: boolean) => {
    setMultiSelectMode(val)
    if (!val) setCheckedIds(new Set())
  }, [])

  useNyaaKeyboard({
    results,
    selectedIndex,
    setSelectedIndex,
    checkedIds,
    onToggleCheck: handleToggleCheck,
    multiSelectMode,
    setMultiSelectMode: handleSetMultiSelectMode,
    enterAction,
    onCopyMagnet: handleCopyMagnet,
    onDownloadTorrent: handleDownloadTorrent,
    onCopyMagnets: handleCopyMagnets,
    onDownloadTorrents: handleDownloadTorrents,
    t,
  })

  const selectedItem: NyaaResult | null =
    !multiSelectMode && selectedIndex >= 0 ? results[selectedIndex] : null

  const leftPanel = (
    <NyaaLeftPanel
      results={results}
      loading={loading}
      error={error}
      query={query}
      selectedIndex={selectedIndex}
      copiedId={copiedId}
      onSelect={setSelectedIndex}
      multiSelectMode={multiSelectMode}
      checkedIds={checkedIds}
      onToggleCheck={handleToggleCheck}
      t={t}
    />
  )

  const rightPanel = (
    <NyaaRightPanel
      item={selectedItem}
      copiedId={copiedId}
      multiSelectMode={multiSelectMode}
      checkedCount={checkedIds.size}
      t={t}
    />
  )

  return TwoPanel ? (
    <TwoPanel left={leftPanel} right={rightPanel} style={{ flex: 1, minHeight: 0 }} />
  ) : (
    <div style={{ display: 'flex', width: '100%', flex: 1, minHeight: 0 }}>
      <div
        style={{
          flex: '1 1 50%',
          minWidth: 0,
          overflowY: 'auto',
          borderRight: 'var(--space-px) solid var(--color-border, rgba(128,128,128,0.2))',
        }}
      >
        {leftPanel}
      </div>
      <div
        style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {rightPanel}
      </div>
    </div>
  )
}
