const React = window.React
const { useState, useEffect, useRef } = React

import type { VideoFormat, DownloadJobPublic } from './types.ts'

const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

const EXT_ID = 'com.nuxy.video-downloader'

interface Props {
  query: string
}

async function ipc<T>(channel: string, payload?: unknown): Promise<T> {
  const res = await window.core.ipc.invoke(EXT_ID, channel, payload) as { success: boolean; data?: T; error?: string }
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
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
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
    const { jobId } = await ipc<{ jobId: string }>('ytdlp:download', { url, formatId: selectedFormat })
    setJobs((prev) => [...prev, { jobId, url, formatId: selectedFormat!, progress: 0, status: 'running' }])
    setFormats([])
    setSelectedFormat(null)
  }

  async function cancelJob(jobId: string) {
    await ipc('ytdlp:cancel', { jobId })
    setJobs((prev) => prev.filter((j) => j.jobId !== jobId))
  }

  _useToolKeyActions([
    {
      key: 'Enter',
      label: formats.length > 0 ? 'Download' : 'Get Formats',
      hint: '↵',
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
      <div style={{ padding: 'var(--space-4)', fontSize: '13px', lineHeight: 1.6 }}>
        <strong>yt-dlp is not installed.</strong>
        <p style={{ opacity: 0.75, marginTop: 8 }}>Install it with one of the following:</p>
        <ul style={{ opacity: 0.75, paddingLeft: 18, marginTop: 4 }}>
          <li><code>pip install yt-dlp</code></li>
          <li><code>brew install yt-dlp</code></li>
          <li><code>pacman -S yt-dlp</code></li>
        </ul>
      </div>
    )
  }

  const mainContent = loading ? (
    <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
      Fetching formats…
    </div>
  ) : error ? (
    <div style={{ padding: '10px 16px', color: 'var(--color-danger)', fontSize: 13 }}>
      {error}
    </div>
  ) : formats.length > 0 ? (
    <div style={{ padding: '8px 12px' }}>
      <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Select format
      </div>
      {formats.map((f) => (
        <label
          key={f.formatId}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 8px',
            cursor: 'pointer',
            fontSize: 13,
            borderRadius: 4,
            background: selectedFormat === f.formatId ? 'var(--surface-overlay)' : 'transparent',
          }}
        >
          <input
            type="radio"
            name="format"
            value={f.formatId}
            checked={selectedFormat === f.formatId}
            onChange={() => setSelectedFormat(f.formatId)}
          />
          <span style={{ flex: 1 }}>
            {f.resolution}{'  '}{f.ext.toUpperCase()}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
            {fmtSize(f.filesize)}
          </span>
        </label>
      ))}
    </div>
  ) : !url ? (
    <div style={{ padding: '20px 16px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
      Paste a video URL in the search bar and press Enter.
    </div>
  ) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto' }}>
      {mainContent}
      {jobs.length > 0 && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Queue
          </div>
          {jobs.map((job) => (
            <div
              key={job.jobId}
              style={{ marginBottom: 6, padding: '6px 8px', borderRadius: 4, background: 'var(--surface-overlay)', fontSize: 12 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ opacity: 0.7, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {truncate(job.url)}
                </span>
                {job.status === 'done' ? (
                  <span style={{ color: 'var(--color-success)', marginLeft: 8 }}>✓</span>
                ) : job.status === 'error' ? (
                  <span style={{ color: 'var(--color-danger)', marginLeft: 8 }}>✗</span>
                ) : (
                  <button
                    onClick={() => void cancelJob(job.jobId)}
                    style={{ marginLeft: 8, padding: '1px 6px', borderRadius: 3, cursor: 'pointer', fontSize: 11, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'inherit' }}
                  >
                    Cancel
                  </button>
                )}
              </div>
              {job.status === 'running' && (
                <div style={{ background: 'var(--surface-overlay)', borderRadius: 3, height: 4 }}>
                  <div style={{ width: `${job.progress}%`, background: 'var(--color-accent)', height: '100%', borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
