const React = window.React
const { useState, useEffect, useRef } = React

import type { VideoFormat, DownloadJobPublic } from './types.ts'

const _useListNavigation = (window.UI || {}).useListNavigation ||
  (() => ({ selectedIndex: -1, setSelectedIndex: () => {}, selectedItem: null }))
const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

const EXT_ID = 'com.nuxy.video-downloader'

interface Props {
  query: string
}

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

function truncate(str: string, max = 50): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
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
  } = window.UI || {}

  const url = (query || '').trim()
  const [ytdlpInstalled, setYtdlpInstalled] = useState<boolean | null>(null)
  const [formats, setFormats] = useState<VideoFormat[]>([])
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobs, setJobs] = useState<DownloadJobPublic[]>([])
  const [lastUrl, setLastUrl] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    ipc<{ installed: boolean }>('ytdlp:status')
      .then(({ installed }) => setYtdlpInstalled(installed))
      .catch(() => setYtdlpInstalled(false))
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
      setFormats([])
      setSelectedFormat(null)
      setError(null)
    }
  }, [url, lastUrl])

  async function getFormats() {
    if (!url) return
    setError(null)
    setFormats([])
    setSelectedFormat(null)
    setLastUrl(url)
    setLoading(true)
    try {
      const result = await ipc<VideoFormat[]>('ytdlp:getFormats', { url })
      setFormats(result)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function startDownload() {
    if (!selectedFormat) return
    const { jobId } = await ipc<{ jobId: string }>('ytdlp:download', {
      url,
      formatId: selectedFormat,
    })
    setJobs((prev) => [
      ...prev,
      { jobId, url, formatId: selectedFormat!, progress: 0, status: 'running' },
    ])
    setFormats([])
    setSelectedFormat(null)
  }

  async function cancelJob(jobId: string) {
    await ipc('ytdlp:cancel', { jobId })
    setJobs((prev) => prev.filter((j) => j.jobId !== jobId))
  }

  const { selectedIndex, setSelectedIndex } = _useListNavigation(formats, {
    onEnter: (fmt: VideoFormat) => setSelectedFormat(fmt.formatId),
    enterLabel: 'Select format',
    enterHint: 'Enter',
  })

  _useToolKeyActions([
    {
      key: 'Enter',
      label: formats.length > 0 && selectedFormat ? 'Download' : 'Get Formats',
      hint: '↵',
      activeOn: () => !!url,
      handler: () => {
        if (formats.length > 0 && selectedFormat) {
          void startDownload()
        } else if (url && !loading) {
          void getFormats()
        }
      },
    },
  ])

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
    return <EmptyState message="Fetching formats…" />
  }

  if (error) {
    return Alert ? <Alert variant="danger">{error}</Alert> : null
  }

  return (
    <>
      {formats.length > 0 && (
        <>
          {SectionHeader && <SectionHeader title="Select Format" />}
          <List>
            {formats.map((f, idx) => (
              <ListItem
                key={f.formatId}
                active={idx === selectedIndex || f.formatId === selectedFormat}
                onClick={() => {
                  setSelectedFormat(f.formatId)
                  setSelectedIndex(idx)
                }}
              >
                <ListItemBody>
                  <ListItemText>{f.resolution} — {f.ext.toUpperCase()}</ListItemText>
                  <ListItemMeta>{fmtSize(f.filesize)}</ListItemMeta>
                </ListItemBody>
                {f.formatId === selectedFormat && Badge && (
                  <ListItemActions>
                    <Badge variant="primary">Selected</Badge>
                  </ListItemActions>
                )}
              </ListItem>
            ))}
          </List>
        </>
      )}

      {!url && formats.length === 0 && (
        <EmptyState message="Paste a video URL in the search bar and press Enter." />
      )}

      {jobs.length > 0 && (
        <>
          {SectionHeader && <SectionHeader title="Queue" />}
          <List>
            {jobs.map((job) => (
              <ListItem key={job.jobId}>
                <ListItemBody>
                  <ListItemText>{truncate(job.url)}</ListItemText>
                  <ListItemMeta>{job.status}</ListItemMeta>
                </ListItemBody>
                <ListItemActions>
                  {job.status === 'running' && ProgressBar && (
                    <ProgressBar value={job.progress} max={100} />
                  )}
                  {job.status === 'running' && Button && (
                    <Button onClick={() => { void cancelJob(job.jobId) }}>Cancel</Button>
                  )}
                  {Badge && job.status === 'done' && <Badge variant="success">Done</Badge>}
                  {Badge && job.status === 'error' && <Badge variant="danger">Error</Badge>}
                </ListItemActions>
              </ListItem>
            ))}
          </List>
        </>
      )}
    </>
  )
}
