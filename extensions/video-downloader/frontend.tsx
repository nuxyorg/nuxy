const React = window.React
const { useState, useEffect, useRef, useMemo } = React

import type { VideoFormat, DownloadJobPublic, VideoMetadata } from './types.ts'

const _useListNavigation = (window.UI || {}).useListNavigation ||
  (() => ({ selectedIndex: -1, setSelectedIndex: () => {}, selectedItem: null }))

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
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function truncate(str: string, max = 50): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

const getVideoAndAudioFormats = (formats: VideoFormat[]): VideoFormat[] => {
  const videoFormats = formats.filter(f => f.vcodec !== 'none')
  const merged: VideoFormat[] = []
  videoFormats.forEach(f => {
    if (f.acodec !== 'none') {
      merged.push(f)
    } else {
      merged.push({
        ...f,
        formatId: `${f.formatId}+bestaudio/best`,
        note: f.note ? `${f.note} + audio` : 'video + audio',
      })
    }
  })
  return merged.sort((a, b) => {
    const getHt = (res: string) => {
      const m = /(\d+)x(\d+)/.exec(res) || /(\d+)p/.exec(res)
      return m ? parseInt(m[2] || m[1]) : 0
    }
    const hA = getHt(a.resolution)
    const hB = getHt(b.resolution)
    if (hB !== hA) return hB - hA
    return (b.tbr || 0) - (a.tbr || 0)
  })
}

const getRecommendedFormats = (formats: VideoFormat[]): VideoFormat[] => {
  const recs: VideoFormat[] = []
  recs.push({
    formatId: 'bestvideo+bestaudio/best',
    ext: 'mp4',
    resolution: 'Best Quality',
    filesize: null,
    note: 'Highest video & audio merged',
  })
  recs.push({
    formatId: 'bestaudio[ext=m4a]/bestaudio/best',
    ext: 'm4a',
    resolution: 'audio only',
    filesize: null,
    note: 'Highest audio quality',
  })
  const videoAudio = getVideoAndAudioFormats(formats)
  const targetHeights = [2160, 1440, 1080, 720, 480, 360]
  const addedHeights = new Set<number>()
  videoAudio.forEach(f => {
    const getHt = (res: string) => {
      const m = /(\d+)x(\d+)/.exec(res) || /(\d+)p/.exec(res)
      return m ? parseInt(m[2] || m[1]) : 0
    }
    const h = getHt(f.resolution)
    if (targetHeights.includes(h) && !addedHeights.has(h)) {
      recs.push({ ...f, note: `${h}p resolution` })
      addedHeights.add(h)
    }
  })
  return recs
}

type TabId = 'recommended' | 'video_audio' | 'audio_only' | 'video_only' | 'all'

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
    ProgressBar,
    TabBar,
    TwoPanel,
    ScrollArea,
    Card,
    CardBody,
    Spinner,
    toast,
    ShortcutSep,
  } = window.UI || {}

  const url = (query || '').trim()
  const [ytdlpInstalled, setYtdlpInstalled] = useState<boolean | null>(null)
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('recommended')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobs, setJobs] = useState<DownloadJobPublic[]>([])
  const [lastUrl, setLastUrl] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    ipc<{ installed: boolean }>('ytdlp:status')
      .then(({ installed }) => setYtdlpInstalled(installed))
      .catch(() => setYtdlpInstalled(false))
    ipc<DownloadJobPublic[]>('ytdlp:queue')
      .then(setJobs)
      .catch(() => {})
  }, [])

  const hasRunning = jobs.some(j => j.status === 'running')

  useEffect(() => {
    if (hasRunning && !pollRef.current) {
      pollRef.current = setInterval(async () => {
        const q = await ipc<DownloadJobPublic[]>('ytdlp:queue')
        setJobs(q)
      }, 1000)
    } else if (!hasRunning && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    return () => {}
  }, [hasRunning])

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  useEffect(() => {
    if (url !== lastUrl) {
      setMetadata(null)
      setError(null)
    }
  }, [url, lastUrl])

  async function getFormats() {
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
    try {
      const { jobId } = await ipc<{ jobId: string }>('ytdlp:download', { url, formatId })
      setJobs(prev => [...prev, { jobId, url, formatId, progress: 0, status: 'running' }])
      if (toast) toast('Download queued!', { type: 'success' })
    } catch (e) {
      if (toast) toast('Failed to start download', { type: 'error' })
      setError((e as Error).message)
    }
  }

  async function cancelJob(jobId: string) {
    await ipc('ytdlp:cancel', { jobId })
    setJobs(prev => prev.filter(j => j.jobId !== jobId))
    if (toast) toast('Download cancelled', { type: 'info' })
  }

  const filteredFormats = useMemo(() => {
    if (!metadata) return []
    switch (activeTab) {
      case 'recommended': return getRecommendedFormats(metadata.formats)
      case 'video_audio': return getVideoAndAudioFormats(metadata.formats)
      case 'audio_only': return metadata.formats.filter(f => f.vcodec === 'none' || f.resolution === 'audio only').sort((a, b) => (b.tbr || 0) - (a.tbr || 0))
      case 'video_only': return metadata.formats.filter(f => f.vcodec !== 'none' && f.acodec === 'none')
      case 'all': default: return metadata.formats
    }
  }, [metadata, activeTab])

  // ── Keyboard navigation ───────────────────────────────────────────────────
  // Single _useListNavigation drives everything: shortcut bar labels,
  // activeOn predicates, and list navigation.
  const [focusArea, setFocusArea] = useState<'left' | 'right'>('right')
  const selectedIndexRef = useRef(-1)

  const { selectedIndex, setSelectedIndex } = _useListNavigation(filteredFormats, {
    onEnter: metadata
      ? (fmt: VideoFormat) => { void startDownload(fmt.formatId) }
      : undefined,
    enterLabel: 'Download',
    enterHint: '↵',
    loop: true,
    extraActions: [
      {
        key: 'Enter',
        label: 'Fetch formats',
        hint: '↵',
        activeOn: () => !!url && !metadata && !loading,
        handler: () => { if (url && !loading) void getFormats() },
      },
      {
        key: 'ArrowLeft',
        label: 'Switch tab',
        handler: () => setFocusArea('left'),
      },
      {
        key: 'ArrowRight',
        label: 'Format list',
        handler: () => setFocusArea('right'),
      },
      {
        key: 'ArrowUp',
        label: 'Prev tab',
        activeOn: () => focusArea === 'left',
        handler: () => {
          setActiveTab(prev => {
            const idx = TABS.findIndex(t => t.id === prev)
            return TABS[Math.max(0, idx - 1)].id as TabId
          })
        },
      },
      {
        key: 'ArrowDown',
        label: 'Next tab',
        activeOn: () => focusArea === 'left',
        handler: () => {
          setActiveTab(prev => {
            const idx = TABS.findIndex(t => t.id === prev)
            return TABS[Math.min(TABS.length - 1, idx + 1)].id as TabId
          })
        },
      },
      {
        key: 'Tab',
        label: 'Next tab',
        hint: 'Tab',
        handler: () => {
          setActiveTab(prev => {
            const idx = TABS.findIndex(t => t.id === prev)
            return TABS[(idx + 1) % TABS.length].id as TabId
          })
          setSelectedIndex(0)
        },
      },
      { key: '1', modifiers: ['alt'], label: 'Recommended', handler: () => { setActiveTab('recommended'); setSelectedIndex(0) } },
      { key: '2', modifiers: ['alt'], label: 'Video & Audio', handler: () => { setActiveTab('video_audio'); setSelectedIndex(0) } },
      { key: '3', modifiers: ['alt'], label: 'Audio Only',   handler: () => { setActiveTab('audio_only');  setSelectedIndex(0) } },
      { key: '4', modifiers: ['alt'], label: 'Video Only',   handler: () => { setActiveTab('video_only');  setSelectedIndex(0) } },
      { key: '5', modifiers: ['alt'], label: 'All Streams',  handler: () => { setActiveTab('all');         setSelectedIndex(0) } },
    ],
  })

  useEffect(() => { selectedIndexRef.current = selectedIndex }, [selectedIndex])

  // Register command palette actions
  useEffect(() => {
    if (!metadata) return
    const actions = [
      { id: 'ytdlp-filter-rec',   label: 'Filter: Recommended', onExecute: () => { setActiveTab('recommended'); setSelectedIndex(0) } },
      { id: 'ytdlp-filter-va',    label: 'Filter: Video & Audio', onExecute: () => { setActiveTab('video_audio');  setSelectedIndex(0) } },
      { id: 'ytdlp-filter-audio', label: 'Filter: Audio Only',   onExecute: () => { setActiveTab('audio_only');   setSelectedIndex(0) } },
      { id: 'ytdlp-filter-video', label: 'Filter: Video Only',   onExecute: () => { setActiveTab('video_only');   setSelectedIndex(0) } },
      { id: 'ytdlp-filter-all',   label: 'Filter: All Streams',  onExecute: () => { setActiveTab('all');          setSelectedIndex(0) } },
    ]
    window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: actions }))
    return () => { window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: [] })) }
  }, [metadata])

  // Footer hints
  useEffect(() => {
    if (!metadata) return
    const activeLabel = TABS.find(t => t.id === activeTab)?.label || activeTab
    window.dispatchEvent(new CustomEvent('nuxy-shell-footer-hints', {
      detail: (
        <>
          <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>
            Filter: {activeLabel}
          </span>
          {ShortcutSep ? <ShortcutSep /> : <span className="nuxy-shortcut-sep">/</span>}
          <span>{filteredFormats.length} formats</span>
        </>
      ),
    }))
    return () => { window.dispatchEvent(new CustomEvent('nuxy-shell-footer-hints', { detail: null })) }
  }, [activeTab, filteredFormats.length, metadata])

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
            ].map(item => (
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
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-8)', gap: 'var(--space-3)' }}>
        {Spinner ? <Spinner /> : <div>Loading...</div>}
        <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Fetching video details and formats…</span>
      </div>
    )
  }

  if (error) {
    return Alert ? <Alert variant="danger">{error}</Alert> : null
  }

  if (!metadata) {
    return EmptyState ? <EmptyState message="Paste a video URL in the search bar and press Enter." /> : null
  }

  // ── Video metadata card ───────────────────────────────────────────────────
  const metaCard = Card && CardBody ? (
    <Card style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)', flexShrink: 0 }}>
      <CardBody style={{ display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-3)' }}>
        {metadata.thumbnail && (
          <div style={{ position: 'relative', width: '120px', minWidth: '120px', height: '68px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
            <img src={metadata.thumbnail} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Video Thumbnail" />
            {metadata.duration && (
              <span style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.8)', color: 'var(--text-normal)', fontSize: '10px', padding: '1px 4px', borderRadius: 'var(--radius-xs)', fontFamily: 'monospace', fontWeight: 'bold' }}>
                {fmtDuration(metadata.duration)}
              </span>
            )}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-normal)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
            {metadata.title}
          </span>
          {metadata.uploader && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: 'var(--space-1)', color: 'var(--text-muted)', fontSize: '12px' }}>
              <span>👤</span>
              <span style={{ fontWeight: '500' }}>{metadata.uploader}</span>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  ) : null

  // ── Format list (right panel) ─────────────────────────────────────────────
  const formatList = (
    <>
      {filteredFormats.length === 0
        ? EmptyState && <EmptyState message="No matching formats for this category." />
        : List && (
          <List>
            {filteredFormats.map((f, idx) => {
              const isSelected = focusArea === 'right' && idx === selectedIndex
              const hasAudio = f.acodec !== 'none' || f.formatId.includes('+bestaudio')
              const isAudioOnly = f.vcodec === 'none' || f.resolution === 'audio only'

              let badgeVariant: string = 'default'
              let badgeText = f.ext.toUpperCase()
              if (isAudioOnly) { badgeVariant = 'warning'; badgeText = 'AUDIO' }
              else if (f.resolution.includes('1080') || f.resolution.includes('2160') || f.resolution.includes('1440')) { badgeVariant = 'success' }
              else if (!hasAudio) { badgeVariant = 'danger'; badgeText = 'SILENT' }

              return (
                <ListItem
                  key={f.formatId + '-' + idx}
                  active={isSelected}
                  onClick={() => {
                    setSelectedIndex(idx)
                    nav.setFocusArea('right')
                    void startDownload(f.formatId)
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <ListItemBody>
                    <ListItemText>
                      <span style={{ fontWeight: '500', marginRight: 'var(--space-2)' }}>{f.resolution}</span>
                      {Badge && <Badge variant={badgeVariant as any}>{badgeText}</Badge>}
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginLeft: 'var(--space-3)' }}>{f.note}</span>
                    </ListItemText>
                    <ListItemMeta>{fmtSize(f.filesize)}</ListItemMeta>
                  </ListItemBody>
                </ListItem>
              )
            })}
          </List>
        )}
    </>
  )

  // ── Download queue ────────────────────────────────────────────────────────
  const queuePanel = jobs.length > 0 && List ? (
    <div style={{ flexShrink: 0 }}>
      <div style={{ padding: 'var(--space-2) var(--space-3)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', opacity: 0.7 }}>Download Queue</div>
      <List style={{ maxHeight: '150px', overflowY: 'auto' }}>
        {jobs.map(job => (
          <ListItem key={job.jobId}>
            <ListItemBody style={{ gap: 'var(--space-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <ListItemText>{truncate(job.url, 38)}</ListItemText>
                <ListItemMeta>
                  {job.status === 'running' && `${job.progress.toFixed(1)}%`}
                  {job.status === 'done' && Badge && <Badge variant="success">Done</Badge>}
                  {job.status === 'error' && Badge && <Badge variant="danger">Error</Badge>}
                </ListItemMeta>
              </div>
              {job.status === 'running' && ProgressBar && (
                <div style={{ width: '100%', marginTop: '4px' }}>
                  <ProgressBar value={job.progress} max={100} />
                </div>
              )}
            </ListItemBody>
            <ListItemActions>
              {job.status === 'running' && Button && (
                <Button onClick={() => { void cancelJob(job.jobId) }} size="sm">Cancel</Button>
              )}
            </ListItemActions>
          </ListItem>
        ))}
      </List>
    </div>
  ) : null

  // ── Left panel: vertical tab bar ──────────────────────────────────────────
  const left = TabBar ? (
    <TabBar
      tabs={TABS}
      active={activeTab}
      orientation="vertical"
      onChange={(id: string) => {
        setActiveTab(id as TabId)
        setSelectedIndex(0)
        setFocusArea('right')
      }}
    />
  ) : null

  // ── Right panel: meta card + format list + queue ──────────────────────────
  const right = ScrollArea ? (
    <ScrollArea style={{ flex: 1 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-1) var(--space-2)' }}>
        {metaCard}
        {formatList}
        {queuePanel}
      </div>
    </ScrollArea>
  ) : null

  if (!TwoPanel) {
    // Fallback if ui-default not loaded
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {metaCard}
        {formatList}
        {queuePanel}
      </div>
    )
  }

  return <TwoPanel left={left} right={right} split="160px" />
}
