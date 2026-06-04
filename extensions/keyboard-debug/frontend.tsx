const React = window.React
const { useState, useMemo, useEffect } = React

const EXT_ID = 'com.nuxy.keyboard-debug'
const _useTranslation =
  (window.UI || {}).useTranslation ||
  (() => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' as const }))

import type { KeyEvent } from './types.ts'
import { useKeyCapture } from './hooks/useKeyCapture.ts'
import { useKeyDebugKeyboard } from './hooks/useKeyDebugKeyboard.ts'
import { CurrentKeyDisplay } from './components/CurrentKeyDisplay.tsx'
import { KeyHistoryList } from './components/KeyHistoryList.tsx'

interface Props {
  query: string
}

export default function KeyboardDebugView({ query }: Props) {
  const { TwoPanel } = window.UI || {}
  const { t, dir } = _useTranslation(EXT_ID)
  const { history, lastKey, clearHistory } = useKeyCapture()
  const [selectedIndex, setSelectedIndex] = useState(-1)

  // Disable omnibox while keyboard-debug is active so all keystrokes are captured
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('nuxy-shell-omni-bar-control', { detail: { action: 'hide' } })
    )
    return () => {
      window.dispatchEvent(
        new CustomEvent('nuxy-shell-omni-bar-control', { detail: { action: 'show' } })
      )
    }
  }, [])

  const filteredHistory = useMemo(() => {
    if (!query.trim()) return history
    const q = query.toLowerCase()
    return history.filter(
      (e: KeyEvent) =>
        e.key.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q) ||
        e.modifiers.some((m) => m.toLowerCase().includes(q))
    )
  }, [history, query])

  useEffect(() => {
    setSelectedIndex(-1)
  }, [query])

  useKeyDebugKeyboard({
    history: filteredHistory,
    selectedIndex,
    setSelectedIndex,
    clearHistory,
    t,
  })

  const leftPanel = (
    <KeyHistoryList
      filteredHistory={filteredHistory}
      selectedIndex={selectedIndex}
      searchQuery={query}
      emptyLabel={t('list.empty.message')}
      emptyHint={t('list.empty.hint')}
    />
  )

  const rightPanel = (
    <CurrentKeyDisplay
      event={lastKey}
      emptyLabel={t('display.pressAnyKey')}
      emptyHint={t('display.hint')}
    />
  )

  return (
    <div
      style={{ direction: dir, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
    >
      {TwoPanel ? (
        <TwoPanel left={leftPanel} right={rightPanel} style={{ flex: 1, minHeight: 0 }} />
      ) : (
        <div style={{ display: 'flex', width: '100%', flex: 1, minHeight: 0 }}>
          <div
            style={{
              flex: '1 1 50%',
              minWidth: 0,
              overflowY: 'auto',
              borderRight: 'var(--space-px) solid var(--border, rgba(128,128,128,0.2))',
            }}
          >
            {leftPanel}
          </div>
          <div
            style={{
              flex: '1 1 50%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {rightPanel}
          </div>
        </div>
      )}
    </div>
  )
}
