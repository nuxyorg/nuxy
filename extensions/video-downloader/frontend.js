const { useState, useEffect, useRef } = window.React
const h = window.React.createElement

const EXT_ID = 'com.nuxy.video-downloader'
const ipc = (channel, payload) => window.core.ipc.invoke(EXT_ID, channel, payload)

function fmtSize(bytes) {
  if (!bytes) return '?'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function truncate(str, max = 40) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

export default function VideoDownloader() {
  const [url, setUrl] = useState('')
  const [formats, setFormats] = useState([])
  const [selectedFormat, setSelectedFormat] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [jobs, setJobs] = useState([])
  const pollRef = useRef(null)

  const hasRunning = jobs.some((j) => j.status === 'running')

  useEffect(() => {
    if (hasRunning && !pollRef.current) {
      pollRef.current = setInterval(async () => {
        const q = await ipc('ytdlp:queue')
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

  async function getFormats() {
    setError(null)
    setFormats([])
    setSelectedFormat(null)
    setLoading(true)
    try {
      const result = await ipc('ytdlp:getFormats', { url })
      setFormats(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function startDownload() {
    if (!selectedFormat) return
    const { jobId } = await ipc('ytdlp:download', { url, formatId: selectedFormat })
    setJobs((prev) => [...prev, { jobId, url, formatId: selectedFormat, progress: 0, status: 'running' }])
  }

  async function cancelJob(jobId) {
    await ipc('ytdlp:cancel', { jobId })
    setJobs((prev) => prev.filter((j) => j.jobId !== jobId))
  }

  return h('div', { style: { padding: '12px', fontFamily: 'inherit' } },
    h('div', { style: { display: 'flex', gap: '8px', marginBottom: '12px' } },
      h('input', {
        type: 'text',
        value: url,
        onChange: (e) => setUrl(e.target.value),
        onKeyDown: (e) => e.key === 'Enter' && url && getFormats(),
        placeholder: 'Paste video URL…',
        style: { flex: 1, padding: '6px 8px', borderRadius: '4px', border: '1px solid #555', background: 'inherit', color: 'inherit' },
      }),
      h('button', {
        onClick: getFormats,
        disabled: !url || loading,
        style: { padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' },
      }, loading ? '…' : 'Get Formats')
    ),

    error && h('div', { style: { color: '#f87171', marginBottom: '10px', fontSize: '13px' } }, error),

    formats.length > 0 && h('div', { style: { marginBottom: '12px' } },
      h('div', { style: { fontWeight: 600, marginBottom: '6px', fontSize: '13px' } }, 'Select format:'),
      formats.map((f) =>
        h('label', {
          key: f.formatId,
          style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', cursor: 'pointer', fontSize: '13px' },
        },
          h('input', {
            type: 'radio',
            name: 'format',
            value: f.formatId,
            checked: selectedFormat === f.formatId,
            onChange: () => setSelectedFormat(f.formatId),
          }),
          h('span', null, `${f.resolution}  ${f.ext.toUpperCase()}  ${fmtSize(f.filesize)}  ${f.note}`)
        )
      ),
      h('button', {
        onClick: startDownload,
        disabled: !selectedFormat,
        style: { marginTop: '8px', padding: '6px 14px', borderRadius: '4px', cursor: selectedFormat ? 'pointer' : 'default' },
      }, 'Download')
    ),

    jobs.length > 0 && h('div', null,
      h('div', { style: { fontWeight: 600, marginBottom: '6px', fontSize: '13px' } }, 'Queue:'),
      jobs.map((job) =>
        h('div', {
          key: job.jobId,
          style: { marginBottom: '8px', padding: '8px', borderRadius: '4px', background: 'rgba(128,128,128,0.1)', fontSize: '12px' },
        },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' } },
            h('span', { style: { opacity: 0.8 } }, truncate(job.url)),
            job.status === 'done'
              ? h('span', { style: { color: '#4ade80' } }, '✓ Done')
              : job.status === 'error'
              ? h('span', { style: { color: '#f87171' } }, 'Error')
              : h('button', {
                  onClick: () => cancelJob(job.jobId),
                  style: { padding: '2px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' },
                }, 'Cancel')
          ),
          job.status === 'running' && h('div', { style: { background: 'rgba(128,128,128,0.2)', borderRadius: '3px', height: '6px' } },
            h('div', {
              style: {
                width: `${job.progress}%`,
                background: '#60a5fa',
                height: '100%',
                borderRadius: '3px',
                transition: 'width 0.3s',
              },
            })
          )
        )
      )
    )
  )
}
