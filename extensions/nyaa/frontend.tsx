const React = window.React
const { useState, useEffect } = React

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
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)

  const { results, loading, error } = useNyaaSearch(query)

  useEffect(() => {
    setSelectedIndex(-1)
  }, [query])

  const { copiedId, handleCopyMagnet } = useNyaaActions()

  useNyaaKeyboard({
    results,
    selectedIndex,
    setSelectedIndex,
    onCopy: handleCopyMagnet,
  })

  const selectedItem: NyaaResult | null = selectedIndex >= 0 ? results[selectedIndex] : null

  const leftPanel = (
    <NyaaLeftPanel
      results={results}
      loading={loading}
      error={error}
      query={query}
      selectedIndex={selectedIndex}
      copiedId={copiedId}
      onSelect={setSelectedIndex}
    />
  )

  const rightPanel = <NyaaRightPanel item={selectedItem} copiedId={copiedId} />

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
      <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {rightPanel}
      </div>
    </div>
  )
}
