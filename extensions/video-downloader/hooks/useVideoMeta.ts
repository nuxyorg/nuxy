const React = window.React

import type { VideoFormat, VideoMetadata, DownloadJobPublic, HistoryItem } from '../types.ts'
import type { TabId, CombinedListItem } from '../utils/format.ts'
import { filterFormats, buildCombinedList } from '../utils/format.ts'

export interface VideoStateSnapshot {
  metadata: VideoMetadata | null
  url: string
  loading: boolean
  selectedIndex: number
  filteredFormats: VideoFormat[]
  jobs: DownloadJobPublic[]
  activeTab: TabId
  history: HistoryItem[]
  downloadSelectedIndex: number
  previousFormatTab: TabId
  combinedList: CombinedListItem[]
}

interface Params {
  metadata: VideoMetadata | null
  activeTab: TabId
  jobs: DownloadJobPublic[]
  history: HistoryItem[]
  url: string
  lastUrl: string
  loading: boolean
  selectedIndex: number
  downloadSelectedIndex: number
  previousFormatTab: TabId
}

interface Result {
  filteredFormats: VideoFormat[]
  combinedList: CombinedListItem[]
  stateRef: React.MutableRefObject<VideoStateSnapshot>
}

export function useVideoMeta({
  metadata,
  activeTab,
  jobs,
  history,
  url,
  lastUrl,
  loading,
  selectedIndex,
  downloadSelectedIndex,
  previousFormatTab,
}: Params): Result {
  const filteredFormats = React.useMemo(
    () => (metadata ? filterFormats(metadata.formats, activeTab) : []),
    [metadata, activeTab]
  )

  const combinedList = React.useMemo(
    () => buildCombinedList(jobs, history),
    [jobs, history]
  )

  const stateRef = React.useRef<VideoStateSnapshot>({
    metadata,
    url: lastUrl || url,
    loading,
    selectedIndex,
    filteredFormats,
    jobs,
    activeTab,
    history,
    downloadSelectedIndex,
    previousFormatTab,
    combinedList,
  })

  stateRef.current = {
    metadata,
    url: lastUrl || url,
    loading,
    selectedIndex,
    filteredFormats,
    jobs,
    activeTab,
    history,
    downloadSelectedIndex,
    previousFormatTab,
    combinedList,
  }

  return { filteredFormats, combinedList, stateRef }
}
