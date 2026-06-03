const React = window.React

import { TABS } from '../utils/storeFilter.ts'

interface Params {
  selectedIndex: number
  activeTab: string
  loading: boolean
  filteredExtensionsLength: number
  activeSectionId: string
  setActiveTab: React.Dispatch<React.SetStateAction<string>>
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
}

export function useStoreSync({ selectedIndex, activeTab, loading, filteredExtensionsLength, activeSectionId, setActiveTab, setSelectedIndex }: Params): void {
  React.useEffect(() => {
    if (activeSectionId !== activeTab) {
      setActiveTab(activeSectionId)
      setSelectedIndex(-1)
    }
  }, [activeSectionId])
  // Refresh key-hint bar on every relevant state change
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [selectedIndex, activeTab, loading, filteredExtensionsLength])

  // Push category label + item count to the shell footer
  React.useEffect(() => {
    const { ShortcutSep } = window.UI || {}
    const activeLabel = TABS.find((t) => t.id === activeTab)?.label || activeTab
    window.dispatchEvent(
      new CustomEvent('nuxy-shell-footer-hints', {
        detail: (
          <>
            <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{activeLabel}</span>
            {ShortcutSep ? <ShortcutSep /> : <span className="nuxy-shortcut-sep">/</span>}
            <span>{filteredExtensionsLength} items</span>
          </>
        ),
      })
    )
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-shell-footer-hints', { detail: null }))
    }
  }, [activeTab, filteredExtensionsLength])
}
