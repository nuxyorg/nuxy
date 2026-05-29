const React = window.React
const { useState, useEffect, useRef, useMemo, useLayoutEffect } = React

import type { VideoFormat, DownloadJobPublic, VideoMetadata } from './types.ts'

const _useListNavigation = (window.UI || {}).useListNavigation ||
  (() => ({ selectedIndex: -1, setSelectedIndex: () => {}, selectedItem: null }))
const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

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

// Group video formats by height and keep the best format for each resolution
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
  
  // 1. Best Quality Video + Audio
  recs.push({
    formatId: 'bestvideo+bestaudio/best',
    ext: 'mp4',
    resolution: 'Best Quality',
    filesize: null,
    note: 'Highest video & audio merged',
  })
  
  // 2. Best Audio Only
  recs.push({
    formatId: 'bestaudio[ext=m4a]/bestaudio/best',
    ext: 'm4a',
    resolution: 'audio only',
    filesize: null,
    note: 'Highest audio quality',
  })
  
  // 3. Common resolutions from available video+audio formats
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
      recs.push({
        ...f,
        note: `${h}p resolution`,
      })
      addedHeights.add(h)
    }
  })
  
  return recs
}

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
    SectionHeader,
    ProgressBar,
    TabBar,
    Card,
    CardBody,
    Spinner,
    toast,
    ShortcutSep,
  } = window.UI || {}

  const url = (query || '').trim()
  const [ytdlpInstalled, setYtdlpInstalled] = useState<boolean | null>(null)
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null)
  const [activeTab, setActiveTab] = useState<'recommended' | 'video_audio' | 'audio_only' | 'video_only' | 'all'>('recommended')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobs, setJobs] = useState<DownloadJobPublic[]>([])
  const [lastUrl, setLastUrl] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  
  const selectedIndexRef = useRef<number>(-1)

  useEffect(() => {
    ipc<{ installed: boolean }>('ytdlp:status')
      .then(({ installed }) => setYtdlpInstalled(installed))
      .catch(() => setYtdlpInstalled(false))
      
    ipc<DownloadJobPublic[]>('ytdlp:queue')
      .then(setJobs)
      .catch(() => {})
  }, [])

  const hasRunning = jobs.some((j) => j.status === 'running')

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
    if (toast) {
      toast('Download starting...', { type: 'info' })
    }
    try {
      const { jobId } = await ipc<{ jobId: string }>('ytdlp:download', {
        url,
        formatId,
      })
      setJobs((prev) => [
        ...prev,
        { jobId, url, formatId, progress: 0, status: 'running' },
      ])
      if (toast) {
        toast('Download queued!', { type: 'success' })
      }
    } catch (e) {
      if (toast) {
        toast('Failed to start download', { type: 'error' })
      }
      setError((e as Error).message)
    }
  }

  async function cancelJob(jobId: string) {
    await ipc('ytdlp:cancel', { jobId })
    setJobs((prev) => prev.filter((j) => j.jobId !== jobId))
    if (toast) {
      toast('Download cancelled', { type: 'info' })
    }
  }

  const tabs = [
    { id: 'recommended', label: 'Recommended' },
    { id: 'video_audio', label: 'Video & Audio' },
    { id: 'audio_only', label: 'Audio Only' },
    { id: 'video_only', label: 'Video Only (Silent)' },
    { id: 'all', label: 'All Streams' },
  ]

  const filteredFormats = useMemo(() => {
    if (!metadata) return []
    switch (activeTab) {
      case 'recommended':
        return getRecommendedFormats(metadata.formats)
      case 'video_audio':
        return getVideoAndAudioFormats(metadata.formats)
      case 'audio_only':
        return metadata.formats.filter(f => f.vcodec === 'none' || f.resolution === 'audio only').sort((a, b) => (b.tbr || 0) - (a.tbr || 0))
      case 'video_only':
        return metadata.formats.filter(f => f.vcodec !== 'none' && f.acodec === 'none')
      case 'all':
      default:
        return metadata.formats
    }
  }, [metadata, activeTab])

  const { selectedIndex, setSelectedIndex } = _useListNavigation(filteredFormats, {
    onEnter: (fmt: VideoFormat) => {
      void startDownload(fmt.formatId)
    },
    enterLabel: 'Download Selected Format',
    enterHint: 'Enter',
    loop: true,
    extraActions: [
      {
        key: 'Tab',
        label: 'Next Tab',
        hint: 'Tab',
        handler: () => {
          setActiveTab(prev => {
            const idx = tabs.findIndex(t => t.id === prev)
            const nextIdx = (idx + 1) % tabs.length
            return tabs[nextIdx].id as any
          })
          setSelectedIndex(0)
        }
      },
      {
        key: '1',
        modifiers: ['alt'],
        label: 'Recommended Tab',
        handler: () => { setActiveTab('recommended'); setSelectedIndex(0) }
      },
      {
        key: '2',
        modifiers: ['alt'],
        label: 'Video & Audio Tab',
        handler: () => { setActiveTab('video_audio'); setSelectedIndex(0) }
      },
      {
        key: '3',
        modifiers: ['alt'],
        label: 'Audio Only Tab',
        handler: () => { setActiveTab('audio_only'); setSelectedIndex(0) }
      },
      {
        key: '4',
        modifiers: ['alt'],
        label: 'Video Only Tab',
        handler: () => { setActiveTab('video_only'); setSelectedIndex(0) }
      },
      {
        key: '5',
        modifiers: ['alt'],
        label: 'All Streams Tab',
        handler: () => { setActiveTab('all'); setSelectedIndex(0) }
      }
    ]
  })

  useLayoutEffect(() => {
    selectedIndexRef.current = selectedIndex
  }, [selectedIndex])

  _useToolKeyActions([
    {
      key: 'Enter',
      label: 'Get Formats',
      hint: '↵',
      activeOn: () => !!url && !metadata && !loading,
      handler: () => {
        if (url && !loading) {
          void getFormats()
        }
      },
    },
  ])

  // Register command palette actions dynamically when metadata is loaded
  useEffect(() => {
    if (!metadata) return
    const actions = [
      { id: 'ytdlp-filter-rec', label: 'Filter: Recommended', onExecute: () => { setActiveTab('recommended'); setSelectedIndex(0) } },
      { id: 'ytdlp-filter-va', label: 'Filter: Video & Audio', onExecute: () => { setActiveTab('video_audio'); setSelectedIndex(0) } },
      { id: 'ytdlp-filter-audio', label: 'Filter: Audio Only', onExecute: () => { setActiveTab('audio_only'); setSelectedIndex(0) } },
      { id: 'ytdlp-filter-video', label: 'Filter: Video Only (Silent)', onExecute: () => { setActiveTab('video_only'); setSelectedIndex(0) } },
      { id: 'ytdlp-filter-all', label: 'Filter: All Streams', onExecute: () => { setActiveTab('all'); setSelectedIndex(0) } },
    ]
    window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: actions }))
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: [] }))
    }
  }, [metadata])

  // Dispatch footer hints for a polished status bar look
  useEffect(() => {
    if (!metadata) return
    const activeLabel = tabs.find(t => t.id === activeTab)?.label || activeTab
    window.dispatchEvent(
      new CustomEvent('nuxy-shell-footer-hints', {
        detail: (
          <>
            <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>
              Filter: {activeLabel}
            </span>
            {ShortcutSep ? <ShortcutSep /> : <span className="nuxy-shortcut-sep">/</span>}
            <span>
              {filteredFormats.length} formats available
            </span>
          </>
        ),
      })
    )
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-shell-footer-hints', { detail: null }))
    }
  }, [activeTab, filteredFormats.length, metadata])

  if (ytdlpInstalled === false) {
    return (
      <>
        {Alert && <Alert variant="danger">yt-dlp is not installed.</Alert>}
        {List && (
          <List>
            <ListItem>
              <ListItemBody>
                <ListItemText>Install via pip</ListItemText>
                <ListItemMeta>pip install yt-dlp</ListItemMeta>
              </ListItemBody>
            </ListItem>
            <ListItem>
              <ListItemBody>
                <ListItemText>Install via brew</ListItemText>
                <ListItemMeta>brew install yt-dlp</ListItemMeta>
              </ListItemBody>
            </ListItem>
            <ListItem>
              <ListItemBody>
                <ListItemText>Install via pacman</ListItemText>
                <ListItemMeta>pacman -S yt-dlp</ListItemMeta>
              </ListItemBody>
            </ListItem>
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {metadata && Card && CardBody && (
        <Card style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-md)' }}>
          <CardBody style={{ display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-3)' }}>
            {metadata.thumbnail && (
              <div style={{ position: 'relative', width: '140px', minWidth: '140px', height: '80px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <img src={metadata.thumbnail} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Video Thumbnail" />
                {metadata.duration && (
                  <span style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0, 0, 0, 0.8)', color: 'var(--text-normal)', fontSize: '10px', padding: '1px 4px', borderRadius: 'var(--radius-xs)', fontFamily: 'monospace', fontWeight: 'bold' }}>
                    {fmtDuration(metadata.duration)}
                  </span>
                )}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-normal)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                {metadata.title}
              </span>
              {metadata.uploader && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: 'var(--space-2)', color: 'var(--text-muted)', fontSize: '12px' }}>
                  <span>👤</span>
                  <span style={{ fontWeight: '500' }}>{metadata.uploader}</span>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {metadata && TabBar && (
        <TabBar
          tabs={tabs}
          active={activeTab}
          onChange={(id: string) => {
            setActiveTab(id as any)
            setSelectedIndex(0)
          }}
        />
      )}

      {metadata && (
        <>
          {SectionHeader && <SectionHeader title="Available Formats" />}
          {filteredFormats.length === 0 ? (
            <EmptyState message="No matching formats for this category." />
          ) : (
            <List style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {filteredFormats.map((f, idx) => {
                const isSelected = idx === selectedIndex
                const hasAudio = f.acodec !== 'none' || f.formatId.includes('+bestaudio')
                const isAudioOnly = f.vcodec === 'none' || f.resolution === 'audio only'
                
                let badgeType: 'primary' | 'success' | 'warning' | 'danger' | 'info' = 'info'
                let badgeText = f.ext.toUpperCase()
                if (isAudioOnly) {
                  badgeType = 'warning'
                  badgeText = 'AUDIO'
                } else if (f.resolution.includes('1080') || f.resolution.includes('2160') || f.resolution.includes('1440')) {
                  badgeType = 'success'
                } else if (!hasAudio) {
                  badgeType = 'danger'
                  badgeText = 'SILENT'
                }

                return (
                  <ListItem
                    key={f.formatId + '-' + idx}
                    active={isSelected}
                    onClick={() => {
                      setSelectedIndex(idx)
                      void startDownload(f.formatId)
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <ListItemBody>
                      <ListItemText>
                        <span style={{ fontWeight: '500', marginRight: 'var(--space-2)' }}>
                          {f.resolution}
                        </span>
                        {Badge && <Badge variant={badgeType}>{badgeText}</Badge>}
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginLeft: 'var(--space-3)' }}>
                          {f.note}
                        </span>
                      </ListItemText>
                      <ListItemMeta>{fmtSize(f.filesize)}</ListItemMeta>
                    </ListItemBody>
                  </ListItem>
                )
              })}
            </List>
          )}
        </>
      )}

      {!url && !metadata && (
        <EmptyState message="Paste a video URL in the search bar and press Enter." />
      )}

      {jobs.length > 0 && (
        <>
          {SectionHeader && <SectionHeader title="Download Queue" />}
          <List style={{ maxHeight: '180px', overflowY: 'auto' }}>
            {jobs.map((job) => (
              <ListItem key={job.jobId}>
                <ListItemBody style={{ gap: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <ListItemText>{truncate(job.url, 40)}</ListItemText>
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
        </>
      )}
    </div>
  )
}
