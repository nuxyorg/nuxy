const React = window.React
const { useState, useEffect, useRef, useMemo } = React

import type { VideoFormat, DownloadJobPublic, VideoMetadata, HistoryItem } from './types.ts'

const _useTwoPanelNav =
  (window.UI || {}).useTwoPanelNav ||
  (({ sections }: { sections: any[] }) => ({
    focusArea: 'right' as const,
    setFocusArea: (_: any) => {},
    activeSectionId: sections[0]?.id ?? '',
    goToSection: (_: string) => {},
    sectionStartIndex: {} as Record<string, number>,
    onItemSelected: (_: number) => {},
  }))

const EXT_ID = 'com.nuxy.video-downloader'

async function ipc<T>(channel: string, payload?: unknown): Promise<T> {
  const res = (await window.core.ipc.invoke(EXT_ID, channel, payload)) as {
    success: boolean
    data?: T
    error?: string
  }
  if (res && res.success) return res.data as T
  throw new Error(res?.error || 'IPC call failed')
}

function fmtSize(bytes: number | null): string {
  if (!bytes) return '?'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function fmtDuration(sec: number | null): string {
  if (sec === null || sec === undefined) return ''
  const hrs = Math.floor(sec / 3600)
  const mins = Math.floor((sec % 3600) / 60)
  const secs = sec % 60
  if (hrs > 0)
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function truncate(str: string, max = 50): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

const getVideoAndAudioFormats = (formats: VideoFormat[]): VideoFormat[] => {
  const merged: VideoFormat[] = []
  formats
    .filter((f) => f.vcodec !== 'none')
    .forEach((f) => {
      if (f.acodec !== 'none') merged.push(f)
      else
        merged.push({
          ...f,
          formatId: `${f.formatId}+bestaudio/best`,
          note: f.note ? `${f.note} + audio` : 'video + audio',
        })
    })
  return merged.sort((a, b) => {
    const ht = (res: string) => {
      const m = /(\d+)x(\d+)/.exec(res) || /(\d+)p/.exec(res)
      return m ? parseInt(m[2] || m[1]) : 0
    }
    if (ht(b.resolution) !== ht(a.resolution)) return ht(b.resolution) - ht(a.resolution)
    return (b.tbr || 0) - (a.tbr || 0)
  })
}

const getRecommendedFormats = (formats: VideoFormat[]): VideoFormat[] => {
  const recs: VideoFormat[] = [
    {
      formatId: 'bestvideo+bestaudio/best',
      ext: 'mp4',
      resolution: 'Best Quality',
      filesize: null,
      note: 'Highest video & audio merged',
    },
    {
      formatId: 'bestaudio[ext=m4a]/bestaudio/best',
      ext: 'm4a',
      resolution: 'audio only',
      filesize: null,
      note: 'Highest audio quality',
    },
  ]
  const ht = (res: string) => {
    const m = /(\d+)x(\d+)/.exec(res) || /(\d+)p/.exec(res)
    return m ? parseInt(m[2] || m[1]) : 0
  }
  const added = new Set<number>()
  getVideoAndAudioFormats(formats).forEach((f) => {
    const h = ht(f.resolution)
    if ([2160, 1440, 1080, 720, 480, 360].includes(h) && !added.has(h)) {
      recs.push({ ...f, note: `${h}p resolution` })
      added.add(h)
    }
  })
  return recs
}

type TabId = 'recommended' | 'video_audio' | 'audio_only' | 'video_only' | 'all' | 'downloads'

const TABS: { id: TabId; label: string }[] = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'video_audio', label: 'Video & Audio' },
  { id: 'audio_only', label: 'Audio Only' },
  { id: 'video_only', label: 'Video Only' },
  { id: 'all', label: 'All Streams' },
]

interface Props {
  query: string
}

export default function VideoDownloader({ query }: Props) {
  const {
    List,
    ListItem,
    ListItemBody,
    ListItemText,
    ListItemMeta,
    ListItemActions,
    EmptyState,
    Alert,
    Button,
    Badge,
    Heading,

    ProgressBar,
    TabBar,
    TwoPanel,
    ScrollArea,
    Card,
    CardBody,
    Spinner,
    toast,
    ShortcutSep,
    Text,
    Box,
    Stack,
    MediaPreview,
  } = window.UI || {}

  const url = (query || '').trim()
  const [ytdlpInstalled, setYtdlpInstalled] = useState<boolean | null>(null)
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('recommended')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobs, setJobs] = useState<DownloadJobPublic[]>([])
  const [lastUrl, setLastUrl] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [jobSelectedIndex, setJobSelectedIndex] = useState(0)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [downloadSelectedIndex, setDownloadSelectedIndex] = useState(0)
  const [previousFormatTab, setPreviousFormatTab] = useState<TabId>('recommended')

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const rightPanelRef = useRef<HTMLDivElement | null>(null)
  const stateRef = useRef({
    metadata,
    url,
    loading,
    selectedIndex,
    filteredFormats: [] as VideoFormat[],
    jobs,
    jobSelectedIndex,
    activeTab,
    history,
    downloadSelectedIndex,
    previousFormatTab,
    combinedList: [] as any[],
  })

  const loadHistory = async () => {
    try {
      const hist = await ipc<HistoryItem[]>('ytdlp:history')
      setHistory(hist || [])
    } catch (e) {
      // Failed to load history
    }
  }

  useEffect(() => {
    ipc<{ installed: boolean }>('ytdlp:status')
      .then(({ installed }) => setYtdlpInstalled(installed))
      .catch(() => setYtdlpInstalled(false))
    ipc<DownloadJobPublic[]>('ytdlp:queue')
      .then(setJobs)
      .catch(() => {})
    void loadHistory()
  }, [])

  useEffect(() => {
    if (activeTab === 'downloads') {
      void loadHistory()
    }
  }, [activeTab])

  const hasRunning = jobs.some((j) => j.status === 'running')
  useEffect(() => {
    if (hasRunning && !pollRef.current) {
      pollRef.current = setInterval(async () => {
        const queue = await ipc<DownloadJobPublic[]>('ytdlp:queue')
        setJobs(queue)
        if (queue.every((j) => j.status !== 'running')) {
          void loadHistory()
        }
      }, 1000)
    } else if (!hasRunning && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    return () => {}
  }, [hasRunning])

  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current)
    },
    []
  )

  useEffect(() => {
    if (url !== lastUrl) {
      setMetadata(null)
      setError(null)
    }
  }, [url, lastUrl])

  const filteredFormats = useMemo(() => {
    if (!metadata) return []
    switch (activeTab) {
      case 'recommended':
        return getRecommendedFormats(metadata.formats)
      case 'video_audio':
        return getVideoAndAudioFormats(metadata.formats)
      case 'audio_only':
        return metadata.formats
          .filter((f) => f.vcodec === 'none' || f.resolution === 'audio only')
          .sort((a, b) => (b.tbr || 0) - (a.tbr || 0))
      case 'video_only':
        return metadata.formats.filter((f) => f.vcodec !== 'none' && f.acodec === 'none')
      case 'all':
      default:
        return metadata.formats
    }
  }, [metadata, activeTab])

  const combinedList = useMemo(() => {
    const list: any[] = []
    for (const job of jobs) {
      list.push({
        jobId: job.jobId,
        url: job.url,
        formatId: job.formatId,
        progress: job.progress,
        status: job.status,
        title: job.metadata?.title || 'Unknown Video',
        thumbnail: job.metadata?.thumbnail || null,
        duration: job.metadata?.duration || null,
        uploader: job.metadata?.uploader || null,
        resolution: job.resolution || 'Unknown',
        outputPath: job.outputPath || null,
        timestamp: Date.now(),
      })
    }
    for (const item of history) {
      if (!list.some((x) => x.jobId === item.id)) {
        list.push({
          jobId: item.id,
          url: item.url,
          formatId: item.formatId,
          progress: item.outputPath ? 100 : 0,
          status: item.outputPath ? 'done' : 'error',
          title: item.title,
          thumbnail: item.thumbnail,
          duration: item.duration,
          uploader: item.uploader,
          resolution: item.resolution,
          outputPath: item.outputPath,
          timestamp: item.timestamp,
        })
      }
    }
    return list.sort((a, b) => {
      if (a.status === 'running' && b.status !== 'running') return -1
      if (a.status !== 'running' && b.status === 'running') return 1
      return b.timestamp - a.timestamp
    })
  }, [jobs, history])

  // Keep stateRef current for use inside stable callbacks
  stateRef.current = {
    metadata,
    url: lastUrl || url,
    loading,
    selectedIndex,
    filteredFormats,
    jobs,
    jobSelectedIndex,
    activeTab,
    history,
    downloadSelectedIndex,
    previousFormatTab,
    combinedList,
  } as any

  async function getFormats() {
    const { url } = stateRef.current
    if (!url) return
    setError(null)
    setMetadata(null)
    setLastUrl(url)
    setLoading(true)
    try {
      const result = await ipc<VideoMetadata>('ytdlp:getFormats', { url })
      setMetadata(result)
      setActiveTab('recommended')
      setSelectedIndex(0)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function startDownload(formatId: string) {
    const { url: downloadUrl, metadata, filteredFormats, activeTab } = stateRef.current
    if (!metadata) return
    const format = filteredFormats.find((f: any) => f.formatId === formatId)
    const resolution = format ? format.resolution : formatId
    try {
      const { jobId } = await ipc<{ jobId: string }>('ytdlp:download', {
        url: downloadUrl,
        formatId,
        metadata: {
          title: metadata.title,
          thumbnail: metadata.thumbnail,
          duration: metadata.duration,
          uploader: metadata.uploader,
        },
        resolution,
      })
      setJobs((prev) => [
        ...prev,
        {
          jobId,
          url: downloadUrl,
          formatId,
          progress: 0,
          status: 'running',
          metadata: {
            title: metadata.title,
            thumbnail: metadata.thumbnail,
            duration: metadata.duration,
            uploader: metadata.uploader,
          },
          resolution,
        },
      ])
      setPreviousFormatTab(activeTab)
      setActiveTab('downloads')
      setDownloadSelectedIndex(0)
      nav.goToSection('downloads')
      if (toast) toast('Download queued!', { type: 'success' })
    } catch (e) {
      if (toast) toast('Failed to start download', { type: 'error' })
      setError((e as Error).message)
    }
  }

  async function cancelJob(jobId: string) {
    await ipc('ytdlp:cancel', { jobId })
    setJobs((prev) => prev.filter((j) => j.jobId !== jobId))
    if (toast) toast('Download cancelled', { type: 'info' })
  }

  // ── useTwoPanelNav (same pattern as settings) ─────────────────────────────
  const navSections = useMemo(
    () => TABS.map((t) => ({ id: t.id, label: t.label, itemCount: 1 })),
    []
  )

  const rightPanelActions = useMemo(
    () => [
      {
        key: 'ArrowUp',
        label: 'Navigate',
        hint: '↑↓',
        handler: () => {
          const { activeTab, metadata } = stateRef.current
          if (activeTab === 'downloads') {
            setDownloadSelectedIndex((i) => Math.max(0, i - 1))
            return
          }
          if (stateRef.current.jobs.length > 0) {
            setJobSelectedIndex((i) => Math.max(0, i - 1))
            return
          }
          if (!metadata) return
          setSelectedIndex((i) => (i <= 0 ? 0 : i - 1))
        },
      },
      {
        key: 'ArrowDown',
        label: 'Navigate',
        handler: () => {
          const { activeTab, filteredFormats, combinedList } = stateRef.current
          if (activeTab === 'downloads') {
            setDownloadSelectedIndex((i) => Math.min(combinedList.length - 1, i + 1))
            return
          }
          if (stateRef.current.jobs.length > 0) {
            setJobSelectedIndex((i) => Math.min(stateRef.current.jobs.length - 1, i + 1))
            return
          }
          setSelectedIndex((i) => (i >= filteredFormats.length - 1 ? 0 : i + 1))
        },
      },
      {
        key: 'Enter',
        label: 'Download / Open',
        hint: '↵',
        handler: () => {
          const {
            activeTab,
            metadata,
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
              void cancelJob(item.jobId)
            } else if (item.status === 'done' && item.outputPath) {
              ipc('ytdlp:open', { path: item.outputPath }).catch(() => {})
            }
            return
          }

          if (!metadata && url && !loading) {
            void getFormats()
            return
          }
          if (metadata && selectedIndex >= 0 && selectedIndex < filteredFormats.length) {
            void startDownload(filteredFormats[selectedIndex].formatId)
          }
        },
      },
      {
        key: 'Enter',
        modifiers: ['shift'] as any,
        label: 'Open Folder',
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
            ipc('ytdlp:open', { path: item.outputPath, isFolder: true }).catch(() => {})
          }
        },
      },
      {
        key: 'Escape',
        label: 'Back to formats',
        hint: 'Esc',
        activeOn: () => {
          const { activeTab, jobs } = stateRef.current
          return activeTab === 'downloads' || jobs.length > 0
        },
        handler: () => {
          const { activeTab, previousFormatTab, jobs } = stateRef.current
          if (activeTab === 'downloads') {
            setActiveTab(previousFormatTab)
            nav.goToSection(previousFormatTab)
            nav.setFocusArea('right')
            return
          }
          if (jobs.length > 0) setJobs([])
        },
      },
      {
        key: 'Tab',
        label: 'Next tab',
        hint: 'Tab',
        handler: () => {
          setActiveTab((prev) => {
            const idx = TABS.findIndex((t) => t.id === prev)
            const nextTab = TABS[(idx + 1) % TABS.length].id as TabId
            nav.goToSection(nextTab)
            return nextTab
          })
          setSelectedIndex(0)
          setDownloadSelectedIndex(0)
        },
      },
      {
        key: 'ArrowLeft',
        label: '',
        handler: () => {
          const { activeTab } = stateRef.current
          if (activeTab !== 'downloads') {
            nav.setFocusArea('left')
          }
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const nav = _useTwoPanelNav({
    sections: navSections,
    initialFocusArea: 'right',
    onSectionChange: (id: string) => {
      setActiveTab(id as TabId)
      setSelectedIndex(-1)
    },
    onFocusRight: () => setSelectedIndex(0),
    rightPanelActions,
  })

  const focusArea: string = nav.focusArea ?? 'right'
  const activeSectionId: string = nav.activeSectionId ?? 'recommended'

  // Keep activeTab in sync when nav drives section change (ArrowUp/Down in left panel)
  useEffect(() => {
    if (activeSectionId !== activeTab) {
      if (activeSectionId === 'downloads') {
        setPreviousFormatTab(activeTab)
        setDownloadSelectedIndex(0)
      }
      setActiveTab(activeSectionId as TabId)
      setSelectedIndex(0)
    }
  }, [activeSectionId])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [
    url,
    metadata,
    loading,
    jobs,
    jobSelectedIndex,
    focusArea,
    activeTab,
    history,
    downloadSelectedIndex,
    combinedList,
  ])

  // Command palette actions
  useEffect(() => {
    const actions = [
      {
        id: 'ytdlp-view-downloads',
        label: 'View Downloads & History',
        onExecute: () => {
          const { activeTab } = stateRef.current
          if (activeTab !== 'downloads') {
            setPreviousFormatTab(activeTab)
          }
          setActiveTab('downloads')
          nav.goToSection('downloads')
          setDownloadSelectedIndex(0)
        },
      },
    ]

    if (metadata) {
      actions.push(
        {
          id: 'ytdlp-filter-rec',
          label: 'Filter: Recommended',
          onExecute: () => {
            nav.goToSection('recommended')
            setSelectedIndex(0)
          },
        },
        {
          id: 'ytdlp-filter-va',
          label: 'Filter: Video & Audio',
          onExecute: () => {
            nav.goToSection('video_audio')
            setSelectedIndex(0)
          },
        },
        {
          id: 'ytdlp-filter-audio',
          label: 'Filter: Audio Only',
          onExecute: () => {
            nav.goToSection('audio_only')
            setSelectedIndex(0)
          },
        },
        {
          id: 'ytdlp-filter-video',
          label: 'Filter: Video Only',
          onExecute: () => {
            nav.goToSection('video_only')
            setSelectedIndex(0)
          },
        },
        {
          id: 'ytdlp-filter-all',
          label: 'Filter: All Streams',
          onExecute: () => {
            nav.goToSection('all')
            setSelectedIndex(0)
          },
        }
      )
    }

    window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: actions }))
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: [] }))
    }
  }, [metadata])

  // Footer hints
  useEffect(() => {
    if (!metadata) return
    const activeLabel = TABS.find((t) => t.id === activeTab)?.label || activeTab
    window.dispatchEvent(
      new CustomEvent('nuxy-shell-footer-hints', {
        detail: (
          <>
            <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{activeLabel}</span>
            {ShortcutSep ? <ShortcutSep /> : <span className="nuxy-shortcut-sep">/</span>}
            <span>{filteredFormats.length} formats</span>
          </>
        ),
      })
    )
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-shell-footer-hints', { detail: null }))
    }
  }, [activeTab, filteredFormats.length, metadata])

  // ── Full-screen Downloads & History view ──────────────────────────────────
  const fullScreenDownloadsView =
    Box && Stack && Text && List && ScrollArea ? (
      <Box
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: 'var(--space-3)',
        }}
      >
        <Stack direction="horizontal" align="center" style={{ marginBottom: 'var(--space-3)' }}>
          <Heading size="lg">Downloads & History</Heading>
        </Stack>

        <ScrollArea style={{ flex: 1 }}>
          {combinedList.length === 0 ? (
            EmptyState && <EmptyState message="No downloads yet. Search for a video to start." />
          ) : (
            <List>
              {combinedList.map((item, idx) => {
                const isActive = idx === downloadSelectedIndex
                const isRunning = item.status === 'running'
                const isDone = item.status === 'done'
                const isError = item.status === 'error'

                let badgeVariant = 'default'
                let badgeText = item.resolution || item.formatId
                if (isRunning) {
                  badgeVariant = 'primary'
                  badgeText = `Downloading (${item.progress.toFixed(1)}%)`
                } else if (isDone) {
                  badgeVariant = 'success'
                } else if (isError) {
                  badgeVariant = 'danger'
                  badgeText = 'ERROR'
                }

                return (
                  <ListItem
                    key={item.jobId}
                    active={isActive}
                    onClick={() => {
                      setDownloadSelectedIndex(idx)
                      if (isDone && item.outputPath) {
                        ipc('ytdlp:open', { path: item.outputPath }).catch(() => {})
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <ListItemBody style={{ gap: 'var(--space-3)', alignItems: 'center' }}>
                      {MediaPreview && (
                        <MediaPreview
                          thumbnail={item.thumbnail}
                          title={item.title}
                          uploader={item.uploader}
                          duration={item.duration}
                          size="sm"
                          badge={Badge && <Badge variant={badgeVariant as any}>{badgeText}</Badge>}
                          progress={isRunning ? item.progress : null}
                          footerText={
                            isDone && item.outputPath ? `Saved to: ${item.outputPath}` : null
                          }
                        />
                      )}
                    </ListItemBody>
                    <ListItemActions style={{ gap: 'var(--space-2)' }}>
                      {isRunning && Button && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            void cancelJob(item.jobId)
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                      {isDone && (
                        <Stack direction="horizontal" gap="var(--space-2)">
                          <Text size="xs" variant="muted">
                            [↵] Open Video
                          </Text>
                          <Text size="xs" variant="muted">
                            [⇧↵] Open Folder
                          </Text>
                        </Stack>
                      )}
                    </ListItemActions>
                  </ListItem>
                )
              })}
            </List>
          )}
        </ScrollArea>
      </Box>
    ) : null

  if (activeTab === 'downloads') {
    return fullScreenDownloadsView
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (ytdlpInstalled === false) {
    return (
      <>
        {Alert && <Alert variant="danger">yt-dlp is not installed.</Alert>}
        {List && (
          <List>
            {[
              { label: 'Install via pip', meta: 'pip install yt-dlp' },
              { label: 'Install via brew', meta: 'brew install yt-dlp' },
              { label: 'Install via pacman', meta: 'pacman -S yt-dlp' },
            ].map((item) => (
              <ListItem key={item.meta}>
                <ListItemBody>
                  <ListItemText>{item.label}</ListItemText>
                  <ListItemMeta>{item.meta}</ListItemMeta>
                </ListItemBody>
              </ListItem>
            ))}
          </List>
        )}
      </>
    )
  }

  if (loading) {
    return Stack && Spinner && Text ? (
      <Stack
        direction="vertical"
        align="center"
        justify="center"
        style={{ flex: 1, minHeight: '200px' }}
        gap="var(--space-3)"
      >
        <Spinner />
        <Text variant="muted" size="sm">
          Fetching video details and formats…
        </Text>
      </Stack>
    ) : (
      <div>Loading...</div>
    )
  }

  if (error) {
    return Alert ? <Alert variant="danger">{error}</Alert> : null
  }

  if (!metadata) {
    return EmptyState ? (
      <EmptyState message="Paste a video URL in the search bar and press Enter." />
    ) : null
  }

  // ── Meta card ─────────────────────────────────────────────────────────────
  const metaCard =
    Card && CardBody && MediaPreview ? (
      <Card style={{ flexShrink: 0 }}>
        <CardBody style={{ padding: 'var(--space-3)' }}>
          <MediaPreview
            thumbnail={metadata.thumbnail}
            title={metadata.title}
            uploader={metadata.uploader}
            duration={metadata.duration}
            size="md"
          />
        </CardBody>
      </Card>
    ) : null

  // ── Format list ───────────────────────────────────────────────────────────
  const formatList =
    List && Text ? (
      filteredFormats.length === 0 ? (
        EmptyState && <EmptyState message="No matching formats for this category." />
      ) : (
        <List>
          {filteredFormats.map((f, idx) => {
            const isActive = focusArea === 'right' && idx === selectedIndex
            const isAudioOnly = f.vcodec === 'none' || f.resolution === 'audio only'
            const hasAudio = f.acodec !== 'none' || f.formatId.includes('+bestaudio')
            let badgeVariant = 'default'
            let badgeText = f.ext.toUpperCase()
            if (isAudioOnly) {
              badgeVariant = 'warning'
              badgeText = 'AUDIO'
            } else if (
              f.resolution.includes('1080') ||
              f.resolution.includes('2160') ||
              f.resolution.includes('1440')
            )
              badgeVariant = 'success'
            else if (!hasAudio) {
              badgeVariant = 'danger'
              badgeText = 'SILENT'
            }

            return (
              <ListItem
                key={f.formatId + '-' + idx}
                active={isActive}
                onClick={() => {
                  setSelectedIndex(idx)
                  nav.setFocusArea('right')
                  void startDownload(f.formatId)
                }}
                style={{ cursor: 'pointer' }}
              >
                <ListItemBody>
                  <ListItemText>
                    <Text
                      as="span"
                      bold
                      style={{ display: 'inline', marginRight: 'var(--space-2)' }}
                    >
                      {f.resolution}
                    </Text>
                    {Badge && <Badge variant={badgeVariant as any}>{badgeText}</Badge>}
                    <Text
                      as="span"
                      variant="muted"
                      size="sm"
                      style={{ display: 'inline', marginLeft: 'var(--space-3)' }}
                    >
                      {f.note}
                    </Text>
                  </ListItemText>
                  <ListItemMeta>{fmtSize(f.filesize)}</ListItemMeta>
                </ListItemBody>
              </ListItem>
            )
          })}
        </List>
      )
    ) : null

  // ── TwoPanel layout (same structure as settings) ──────────────────────────
  const left = TabBar ? (
    <TabBar
      tabs={TABS}
      active={activeTab}
      orientation="vertical"
      onChange={(id: string) => {
        nav.goToSection(id)
      }}
    />
  ) : null

  const right =
    ScrollArea && Box ? (
      <ScrollArea ref={rightPanelRef} style={{ flex: 1 }}>
        <Box
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            padding: 'var(--space-1) var(--space-2)',
          }}
        >
          {formatList}
        </Box>
      </ScrollArea>
    ) : null

  if (!TwoPanel) {
    return Stack ? (
      <Stack gap="var(--space-4)">
        {metaCard}
        {formatList}
      </Stack>
    ) : null
  }

  return Box && TwoPanel ? (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {metaCard && (
        <Box style={{ flexShrink: 0, padding: 'var(--space-1) var(--space-2) 0' }}>{metaCard}</Box>
      )}
      <Box style={{ flex: 1, minHeight: 0 }}>
        <TwoPanel left={left} right={right} split="160px" />
      </Box>
    </Box>
  ) : null
}
