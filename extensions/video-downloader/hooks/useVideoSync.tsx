const React = window.React

import type { VideoMetadata, DownloadJobPublic } from '../types.ts'
import type { TabId, CombinedListItem } from '../utils/format.ts'
import { TABS } from '../utils/format.ts'

interface Params {
  url: string
  lastUrl: string
  metadata: VideoMetadata | null
  loading: boolean
  jobs: DownloadJobPublic[]
  focusArea: string
  activeTab: TabId
  activeSectionId: string
  downloadSelectedIndex: number
  combinedList: CombinedListItem[]
  filteredFormatsLength: number
  loadHistory: () => Promise<void>
  setMetadata: (m: VideoMetadata | null) => void
  setError: (e: string | null) => void
  setActiveTab: (t: TabId) => void
  setSelectedIndex: (i: number) => void
  setDownloadSelectedIndex: (i: number) => void
  setPreviousFormatTab: (t: TabId) => void
  ShortcutSep?: React.ComponentType
}

export function useVideoSync({
  url,
  lastUrl,
  metadata,
  loading,
  jobs,
  focusArea,
  activeTab,
  activeSectionId,
  downloadSelectedIndex,
  combinedList,
  filteredFormatsLength,
  loadHistory,
  setMetadata,
  setError,
  setActiveTab,
  setSelectedIndex,
  setDownloadSelectedIndex,
  setPreviousFormatTab,
  ShortcutSep,
}: Params): void {
  React.useEffect(() => {
    if (url !== lastUrl) {
      setMetadata(null)
      setError(null)
    }
  }, [url, lastUrl])

  React.useEffect(() => {
    if (activeSectionId !== activeTab) {
      if (activeSectionId === 'downloads') {
        setPreviousFormatTab(activeTab)
        setDownloadSelectedIndex(0)
      }
      setActiveTab(activeSectionId as TabId)
      setSelectedIndex(0)
    }
  }, [activeSectionId])

  React.useEffect(() => {
    if (activeTab === 'downloads') void loadHistory()
  }, [activeTab])

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [url, metadata, loading, jobs, focusArea, activeTab, downloadSelectedIndex, combinedList])

  React.useEffect(() => {
    if (!metadata) return
    const activeLabel = TABS.find((t) => t.id === activeTab)?.label || activeTab
    window.dispatchEvent(
      new CustomEvent('nuxy-shell-footer-hints', {
        detail: (
          <>
            <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{activeLabel}</span>
            {ShortcutSep ? <ShortcutSep /> : <span className="nuxy-shortcut-sep">/</span>}
            <span>{filteredFormatsLength} formats</span>
          </>
        ),
      })
    )
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-shell-footer-hints', { detail: null }))
    }
  }, [activeTab, filteredFormatsLength, metadata, ShortcutSep])
}
