const React = window.React

import type { VideoFormat, VideoMetadata, DownloadJobPublic } from '../types.ts'
import type { TabId } from '../utils/format.ts'
import { ipc } from '../utils/ipc.ts'

interface Params {
  url: string
  metadata: VideoMetadata | null
  filteredFormats: VideoFormat[]
  activeTab: TabId
  setMetadata: React.Dispatch<React.SetStateAction<VideoMetadata | null>>
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setLastUrl: React.Dispatch<React.SetStateAction<string>>
  setActiveTab: React.Dispatch<React.SetStateAction<TabId>>
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
  setJobs: React.Dispatch<React.SetStateAction<DownloadJobPublic[]>>
  setPreviousFormatTab: React.Dispatch<React.SetStateAction<TabId>>
  setDownloadSelectedIndex: React.Dispatch<React.SetStateAction<number>>
  goToSection: (id: string) => void
}

interface Actions {
  getFormats: () => Promise<void>
  startDownload: (formatId: string) => Promise<void>
  cancelJob: (jobId: string) => Promise<void>
  openFile: (path: string, isFolder?: boolean) => void
}

export function useVideoActions({
  url,
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
  goToSection,
}: Params): Actions {
  const { toast } = window.UI || {}

  const getFormats = React.useCallback(async () => {
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
  }, [url, setError, setMetadata, setLastUrl, setLoading, setActiveTab, setSelectedIndex])

  const startDownload = React.useCallback(
    async (formatId: string) => {
      if (!metadata) return
      const format = filteredFormats.find((f: VideoFormat) => f.formatId === formatId)
      const resolution = format ? format.resolution : formatId
      try {
        const { jobId } = await ipc<{ jobId: string }>('ytdlp:download', {
          url,
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
            url,
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
        goToSection('downloads')
        if (toast) toast('Download queued!', { type: 'success' })
      } catch (e) {
        if (toast) toast('Failed to start download', { type: 'error' })
        setError((e as Error).message)
      }
    },
    [
      url,
      metadata,
      filteredFormats,
      activeTab,
      setJobs,
      setPreviousFormatTab,
      setActiveTab,
      setDownloadSelectedIndex,
      goToSection,
      setError,
      toast,
    ]
  )

  const cancelJob = React.useCallback(
    async (jobId: string) => {
      await ipc('ytdlp:cancel', { jobId })
      setJobs((prev) => prev.filter((j) => j.jobId !== jobId))
      if (toast) toast('Download cancelled', { type: 'info' })
    },
    [setJobs, toast]
  )

  const openFile = React.useCallback((path: string, isFolder = false) => {
    ipc('ytdlp:open', { path, ...(isFolder ? { isFolder: true } : {}) }).catch(() => {})
  }, [])

  return { getFormats, startDownload, cancelJob, openFile }
}
