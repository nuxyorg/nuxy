const React = window.React

import type { DownloadJobPublic, HistoryItem } from '../types.ts'

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

interface VideoDataResult {
  ytdlpInstalled: boolean | null
  jobs: DownloadJobPublic[]
  setJobs: React.Dispatch<React.SetStateAction<DownloadJobPublic[]>>
  history: HistoryItem[]
  setHistory: React.Dispatch<React.SetStateAction<HistoryItem[]>>
  loadHistory: () => Promise<void>
}

export function useVideoData(): VideoDataResult {
  const [ytdlpInstalled, setYtdlpInstalled] = React.useState<boolean | null>(null)
  const [jobs, setJobs] = React.useState<DownloadJobPublic[]>([])
  const [history, setHistory] = React.useState<HistoryItem[]>([])

  const loadHistory = React.useCallback(async () => {
    try {
      const hist = await ipc<HistoryItem[]>('ytdlp:history')
      setHistory(hist || [])
    } catch {
      // Failed to load history — silently ignore
    }
  }, [])

  // Initial load: check yt-dlp status, fetch queue and history
  React.useEffect(() => {
    ipc<{ installed: boolean }>('ytdlp:status')
      .then(({ installed }) => setYtdlpInstalled(installed))
      .catch(() => setYtdlpInstalled(false))
    ipc<DownloadJobPublic[]>('ytdlp:queue')
      .then(setJobs)
      .catch(() => {})
    void loadHistory()
  }, [loadHistory])

  // Poll the job queue while any job is running; reload history when all finish
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const hasRunning = jobs.some((j) => j.status === 'running')

  React.useEffect(() => {
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
  }, [hasRunning, loadHistory])

  // Cleanup interval on unmount
  React.useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  return { ytdlpInstalled, jobs, setJobs, history, setHistory, loadHistory }
}
