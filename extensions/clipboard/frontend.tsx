const React = window.React

import type { ClipboardItem } from './types.ts'
import { useClipboardHistory } from './hooks/useClipboardHistory.ts'
import { useClipboardActions } from './hooks/useClipboardActions.ts'
import { useSelectedItemMeta } from './hooks/useSelectedItemMeta.ts'
import { useClipboardKeyboard } from './hooks/useClipboardKeyboard.ts'
import { useOmniBarSync } from './hooks/useOmniBarSync.ts'
import { ClipboardLeftPanel } from './components/ClipboardLeftPanel.tsx'
import { ClipboardRightPanel } from './components/ClipboardRightPanel.tsx'
import { ClipboardFileAlert } from './components/ClipboardFileAlert.tsx'

interface Props {
  query: string
}

export default function ClipboardView({ query }: Props) {
  const { TwoPanel } = window.UI || {}

  const { items, setItems } = useClipboardHistory()
  const [selectedIndex, setSelectedIndex] = React.useState(-1)

  const searchQuery = query || ''

  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) return items
    const q = searchQuery.toLowerCase()
    return items.filter((item) => item.text?.toLowerCase().includes(q))
  }, [items, searchQuery])

  // Inline reset: when searchQuery changes, reset selectedIndex during render
  const [prevSearchQuery, setPrevSearchQuery] = React.useState(searchQuery)
  if (searchQuery !== prevSearchQuery) {
    setPrevSearchQuery(searchQuery)
    setSelectedIndex(-1)
  }

  useOmniBarSync(selectedIndex)

  const { copiedId, handleCopy, handleCopyFile, handlePin, handleUnpin, handleDelete } = useClipboardActions({
    filteredItems,
    searchQuery,
    setItems,
    setSelectedIndex,
  })

  const { imageDimensions, fileExists } = useSelectedItemMeta({ selectedIndex, filteredItems })

  useClipboardKeyboard({
    filteredItems,
    selectedIndex,
    setSelectedIndex,
    handlers: { handleCopy, handleCopyFile, handleDelete, handlePin, handleUnpin },
  })

  const selectedItem = selectedIndex >= 0 ? filteredItems[selectedIndex] : null

  const leftPanel = (
    <ClipboardLeftPanel
      items={filteredItems}
      allItems={items}
      copiedId={copiedId}
      selectedIndex={selectedIndex}
      searchQuery={searchQuery}
      onSelect={setSelectedIndex}
    />
  )

  const rightPanel = (
    <ClipboardRightPanel item={selectedItem} imageDimensions={imageDimensions} />
  )

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {TwoPanel ? (
        <TwoPanel left={leftPanel} right={rightPanel} style={{ flex: 1, minHeight: 0 }} />
      ) : (
        <div style={{ display: 'flex', width: '100%', flex: 1, minHeight: 0 }}>
          <div
            style={{
              flex: '1 1 50%',
              minWidth: 0,
              overflowY: 'auto',
              borderRight: 'var(--space-px) solid var(--color-border, rgba(128, 128, 128, 0.2))',
            }}
          >
            {leftPanel}
          </div>
          <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {rightPanel}
          </div>
        </div>
      )}

      <ClipboardFileAlert fileExists={fileExists} />
    </div>
  )
}
