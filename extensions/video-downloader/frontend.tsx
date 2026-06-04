const React = window.React

const EXT_ID = 'com.nuxy.video-downloader'
const _useTranslation =
  (window.UI || {}).useTranslation ||
  (() => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' as const }))

import type { VideoMetadata } from './types.ts'
import type { TabId } from './utils/format.ts'
import { TABS } from './utils/format.ts'
import { useVideoData } from './hooks/useVideoData.ts'
import { useVideoMeta } from './hooks/useVideoMeta.ts'
import { useVideoActions } from './hooks/useVideoActions.ts'
import { useVideoKeyboard } from './hooks/useVideoKeyboard.ts'
import { useVideoSync } from './hooks/useVideoSync.tsx'
import { VideoMetaCard } from './components/VideoMetaCard.tsx'
import { VideoFormatList } from './components/VideoFormatList.tsx'
import { VideoDownloadsList } from './components/VideoDownloadsList.tsx'
import { YtdlpInstallPrompt } from './components/YtdlpInstallPrompt.tsx'

interface NavSection {
  id: string
  label: string
  itemCount: number
}

const _useTwoPanelNav =
  (window.UI || {}).useTwoPanelNav ||
  (({ sections }: { sections: NavSection[] }) => ({
    focusArea: 'right' as const,
    setFocusArea: () => {},
    activeSectionId: sections[0]?.id ?? '',
    goToSection: () => {},
    sectionStartIndex: {} as Record<string, number>,
    getSectionIdForIndex: () => sections[0]?.id ?? '',
    onItemSelected: () => {},
    setActiveSection: () => {},
  }))

interface Props {
  query: string
}

export default function VideoDownloader({ query }: Props) {
  const { TabBar, TwoPanel, ScrollArea, Box, Stack, Alert, EmptyState, ShortcutSep } =
    window.UI || {}
  const { t } = _useTranslation(EXT_ID)
  const LoadingState = (window.UI as any)?.LoadingState

  const url = (query || '').trim()

  // ── State ────────────────────────────────────────────────────────────────────
  const { ytdlpInstalled, jobs, setJobs, history, loadHistory } = useVideoData()
  const [metadata, setMetadata] = React.useState<VideoMetadata | null>(null)
  const [activeTab, setActiveTab] = React.useState<TabId>('recommended')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [lastUrl, setLastUrl] = React.useState('')
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [downloadSelectedIndex, setDownloadSelectedIndex] = React.useState(0)
  const [previousFormatTab, setPreviousFormatTab] = React.useState<TabId>('recommended')

  // ── Derived state + stable stateRef ──────────────────────────────────────────
  const { filteredFormats, combinedList, stateRef } = useVideoMeta({
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
  })

  // ── Nav ──────────────────────────────────────────────────────────────────────
  const navSections = React.useMemo(
    () => TABS.map((t) => ({ id: t.id, label: t.label, itemCount: 1 })),
    []
  )
  const rightPanelRef = React.useRef<HTMLDivElement | null>(null)
  const nav = _useTwoPanelNav({
    sections: navSections,
    initialFocusArea: 'right',
    onSectionChange: (id: string) => {
      setActiveTab(id as TabId)
      setSelectedIndex(-1)
    },
    onFocusRight: () => setSelectedIndex(0),
    rightPanelActions: [],
  })
  const focusArea: string = nav.focusArea ?? 'right'
  const activeSectionId: string = nav.activeSectionId ?? 'recommended'

  // ── Actions ───────────────────────────────────────────────────────────────────
  const actions = useVideoActions({
    url: stateRef.current.url,
    metadata,
    filteredFormats,
    activeTab,
    setMetadata,
    setLoading,
    setError,
    setLastUrl,
    setActiveTab,
    setSelectedIndex,
    setJobs,
    setPreviousFormatTab,
    setDownloadSelectedIndex,
    goToSection: nav.goToSection,
  })

  // ── Keyboard + palette ────────────────────────────────────────────────────────
  useVideoKeyboard({
    stateRef,
    setSelectedIndex,
    setDownloadSelectedIndex,
    setActiveTab,
    setJobs,
    setPreviousFormatTab,
    metadata,
    actions,
    goToSection: nav.goToSection,
    setFocusArea: nav.setFocusArea,
    t,
  })

  // ── Shell sync ────────────────────────────────────────────────────────────────
  useVideoSync({
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
    filteredFormatsLength: filteredFormats.length,
    loadHistory,
    setMetadata,
    setError,
    setActiveTab,
    setSelectedIndex,
    setDownloadSelectedIndex,
    setPreviousFormatTab,
    ShortcutSep,
  })

  // ── Views ─────────────────────────────────────────────────────────────────────
  if (activeTab === 'downloads')
    return (
      <VideoDownloadsList
        combinedList={combinedList}
        downloadSelectedIndex={downloadSelectedIndex}
      />
    )

  if (ytdlpInstalled === false) return <YtdlpInstallPrompt />

  if (loading)
    return LoadingState ? (
      <LoadingState message={t('loading.fetchingFormats')} />
    ) : (
      <div style={{ padding: 'var(--space-4)', textAlign: 'center', opacity: 0.7 }}>
        {t('loading.generic')}
      </div>
    )

  if (error) return Alert ? <Alert variant="danger">{error}</Alert> : null

  if (!metadata) return EmptyState ? <EmptyState message={t('empty.pasteUrl')} /> : null

  // ── Main layout ───────────────────────────────────────────────────────────────
  const left = TabBar ? (
    <TabBar
      tabs={TABS}
      active={activeTab}
      orientation="vertical"
      onChange={(id: string) => nav.goToSection(id)}
    />
  ) : null

  const right =
    (ScrollArea as unknown) && (Box as unknown) ? (
      <ScrollArea ref={rightPanelRef} style={{ flex: 1 }}>
        <Box
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            padding: 'var(--space-1) var(--space-2)',
          }}
        >
          <VideoFormatList
            formats={filteredFormats}
            selectedIndex={selectedIndex}
            focusArea={focusArea}
          />
        </Box>
      </ScrollArea>
    ) : null

  if (!TwoPanel)
    return Stack ? (
      <Stack gap="var(--space-4)">
        <VideoMetaCard metadata={metadata} />
        <VideoFormatList
          formats={filteredFormats}
          selectedIndex={selectedIndex}
          focusArea={focusArea}
        />
      </Stack>
    ) : null

  return (Box as unknown) && (TwoPanel as unknown) ? (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box style={{ flexShrink: 0, padding: 'var(--space-1) var(--space-2) 0' }}>
        <VideoMetaCard metadata={metadata} />
      </Box>
      <Box style={{ flex: 1, minHeight: 0 }}>
        <TwoPanel left={left} right={right} split="160px" />
      </Box>
    </Box>
  ) : null
}
