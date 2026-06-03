const React = window.React

import type { DownloadJobPublic, HistoryItem } from '../types.ts'
import { ipc } from '../utils/ipc.ts'

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
      const id = setInterval(async () => {
        const queue = await ipc<DownloadJobPublic[]>('ytdlp:queue')
        setJobs(queue)
        if (queue.every((j) => j.status !== 'running')) {
          void loadHistory()
        }
      }, 1000)
      pollRef.current = id
      return () => {
        clearInterval(id)
        pollRef.current = null
      }
    } else if (!hasRunning && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [hasRunning, loadHistory])

  return { ytdlpInstalled, jobs, setJobs, history, setHistory, loadHistory }
}
