const React = window.React

import type { VideoMetadata, DownloadJobPublic } from '../types.ts'
import type { TabId } from '../utils/format.ts'
import { TABS } from '../utils/format.ts'
import type { VideoStateSnapshot as StateSnapshot } from './useVideoMeta.ts'

interface Actions {
  getFormats: () => Promise<void>
  startDownload: (formatId: string) => Promise<void>
  cancelJob: (jobId: string) => Promise<void>
  openFile: (path: string, isFolder?: boolean) => void
}

interface Params {
  stateRef: React.MutableRefObject<StateSnapshot>
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
  setDownloadSelectedIndex: React.Dispatch<React.SetStateAction<number>>
  setActiveTab: React.Dispatch<React.SetStateAction<TabId>>
  setJobs: React.Dispatch<React.SetStateAction<DownloadJobPublic[]>>
  setPreviousFormatTab: React.Dispatch<React.SetStateAction<TabId>>
  metadata: VideoMetadata | null
  actions: Actions
  goToSection: (id: string) => void
  setFocusArea: (area: 'left' | 'right') => void
  t: (key: string) => string
}

export function useVideoKeyboard({
  stateRef,
  setSelectedIndex,
  setDownloadSelectedIndex,
  setActiveTab,
  setJobs,
  setPreviousFormatTab,
  metadata,
  actions,
  goToSection,
  setFocusArea,
  t,
}: Params): void {
  const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

  _useToolKeyActions([
    {
      key: 'ArrowUp',
      label: t('actions.navigate'),
      hint: '↑↓',
      handler: () => {
        const { activeTab, metadata: meta, jobs } = stateRef.current
        if (activeTab === 'downloads') {
          setDownloadSelectedIndex((i) => Math.max(0, i - 1))
          return
        }
        if (jobs.length > 0) return
        if (!meta) return
        setSelectedIndex((i) => (i <= 0 ? 0 : i - 1))
      },
    },
    {
      key: 'ArrowDown',
      label: t('actions.navigate'),
      handler: () => {
        const { activeTab, filteredFormats, combinedList, jobs } = stateRef.current
        if (activeTab === 'downloads') {
          setDownloadSelectedIndex((i) => Math.min(combinedList.length - 1, i + 1))
          return
        }
        if (jobs.length > 0) return
        setSelectedIndex((i) => (i >= filteredFormats.length - 1 ? 0 : i + 1))
      },
    },
    {
      key: 'Enter',
      label: t('actions.download'),
      hint: '↵',
      handler: () => {
        const {
          activeTab,
          metadata: meta,
          url,
          loading,
          selectedIndex,
          filteredFormats,
          downloadSelectedIndex,
          combinedList,
        } = stateRef.current

        if (activeTab === 'downloads') {
          const item = combinedList[downloadSelectedIndex]
          if (!item) return
          if (item.status === 'running') {
            void actions.cancelJob(item.jobId)
          } else if (item.status === 'done' && item.outputPath) {
            actions.openFile(item.outputPath)
          }
          return
        }

        if (!meta && url && !loading) {
          void actions.getFormats()
          return
        }
        if (meta && selectedIndex >= 0 && selectedIndex < filteredFormats.length) {
          void actions.startDownload(filteredFormats[selectedIndex].formatId)
        }
      },
    },
    {
      key: 'Enter',
      modifiers: ['shift'] as ('ctrl' | 'shift' | 'alt' | 'meta')[],
      label: t('actions.openFolder'),
      hint: '⇧↵',
      activeOn: () => {
        const { activeTab, combinedList, downloadSelectedIndex } = stateRef.current
        if (activeTab !== 'downloads') return false
        const item = combinedList[downloadSelectedIndex]
        return !!(item && item.status === 'done' && item.outputPath)
      },
      handler: () => {
        const { combinedList, downloadSelectedIndex } = stateRef.current
        const item = combinedList[downloadSelectedIndex]
        if (item && item.status === 'done' && item.outputPath) {
          actions.openFile(item.outputPath, true)
        }
      },
    },
    {
      key: 'Tab',
      label: t('actions.nextTab'),
      hint: 'Tab',
      handler: () => {
        setActiveTab((prev) => {
          const idx = TABS.findIndex((tab) => tab.id === prev)
          const nextTab = TABS[(idx + 1) % TABS.length].id as TabId
          goToSection(nextTab)
          return nextTab
        })
        setSelectedIndex(0)
        setDownloadSelectedIndex(0)
      },
    },
    {
      key: 'Escape',
      label: t('actions.backToFormats'),
      hint: 'Esc',
      activeOn: () => {
        const { activeTab, jobs } = stateRef.current
        return activeTab === 'downloads' || jobs.length > 0
      },
      handler: () => {
        const { activeTab, previousFormatTab, jobs } = stateRef.current
        if (activeTab === 'downloads') {
          setActiveTab(previousFormatTab)
          goToSection(previousFormatTab)
          setFocusArea('right')
          return
        }
        if (jobs.length > 0) setJobs([])
      },
    },
    {
      key: 'ArrowLeft',
      label: '',
      handler: () => {
        const { activeTab } = stateRef.current
        if (activeTab !== 'downloads') {
          setFocusArea('left')
        }
      },
    },
  ])

  // Command palette actions
  React.useEffect(() => {
    const paletteActions = [
      {
        id: 'ytdlp-view-downloads',
        label: t('commandPalette.viewDownloads'),
        onExecute: () => {
          const { activeTab } = stateRef.current
          if (activeTab !== 'downloads') {
            setPreviousFormatTab(activeTab)
          }
          setActiveTab('downloads')
          goToSection('downloads')
          setDownloadSelectedIndex(0)
        },
      },
    ]

    if (metadata) {
      paletteActions.push(
        {
          id: 'ytdlp-filter-rec',
          label: t('commandPalette.filterRecommended'),
          onExecute: () => {
            goToSection('recommended')
            setSelectedIndex(0)
          },
        },
        {
          id: 'ytdlp-filter-va',
          label: t('commandPalette.filterVideoAudio'),
          onExecute: () => {
            goToSection('video_audio')
            setSelectedIndex(0)
          },
        },
        {
          id: 'ytdlp-filter-audio',
          label: t('commandPalette.filterAudioOnly'),
          onExecute: () => {
            goToSection('audio_only')
            setSelectedIndex(0)
          },
        },
        {
          id: 'ytdlp-filter-video',
          label: t('commandPalette.filterVideoOnly'),
          onExecute: () => {
            goToSection('video_only')
            setSelectedIndex(0)
          },
        },
        {
          id: 'ytdlp-filter-all',
          label: t('commandPalette.filterAllStreams'),
          onExecute: () => {
            goToSection('all')
            setSelectedIndex(0)
          },
        }
      )
    }

    window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: paletteActions }))
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: [] }))
    }
  }, [metadata, t])
}
