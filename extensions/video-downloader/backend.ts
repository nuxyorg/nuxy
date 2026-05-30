import type { CoreContext } from '@nuxy/extension-sdk'
import type { VideoFormat, DownloadJob, DownloadJobPublic, VideoDownloaderConfig, VideoMetadata, HistoryItem } from './types.ts'

const PROGRESS_RE = /\[download\]\s+([\d.]+)%/

async function checkBinary(core: CoreContext): Promise<boolean> {
  const { code } = await core.shell.exec('which', ['yt-dlp']).catch(() => ({ code: 1, stdout: '' }))
  return code === 0
}

export async function register(core: CoreContext): Promise<void> {
  const config: VideoDownloaderConfig = { outputDir: `${core.fs.homedir()}/Downloads` }

  const saved = await core.storage.read<VideoDownloaderConfig>('config.json')
  if (saved?.outputDir) {
    config.outputDir = saved.outputDir
  }

  const installed = await checkBinary(core)
  if (!installed) {
    core.logger.warn('yt-dlp is not installed. Install it with: pip install yt-dlp')
  }

  const jobs = new Map<string, DownloadJob>()

  core.registry.registerTool({ name: 'video-downloader' })

  core.ipc.handle('ytdlp:status', async () => ({ installed }))

  core.ipc.handle('ytdlp:getFormats', async (payload: unknown): Promise<VideoMetadata> => {
    const { url } = payload as { url: string }
    let stdout: string
    try {
      ;({ stdout } = await core.shell.exec('yt-dlp', ['-J', '--no-download', url], {
        maxBuffer: 10 * 1024 * 1024,
      }))
    } catch (err) {
      const e = err as { code?: string }
      if (e.code === 'ENOENT')
        throw new Error('yt-dlp is not installed. Install it with: pip install yt-dlp')
      throw err
    }
    const data = JSON.parse(stdout) as {
      title?: string
      thumbnail?: string
      thumbnails?: Array<{ url: string }>
      duration?: number
      uploader?: string
      channel?: string
      formats: Array<{
        format_id: string
        ext: string
        resolution?: string
        width?: number
        height?: number
        filesize?: number | null
        filesize_approx?: number | null
        format_note?: string
        vcodec?: string
        acodec?: string
        fps?: number | null
        tbr?: number | null
      }>
    }

    const title = data.title ?? 'Unknown Video'
    const thumbnail = data.thumbnail ?? (data.thumbnails && data.thumbnails.length > 0 ? data.thumbnails[data.thumbnails.length - 1].url : null) ?? null
    const duration = typeof data.duration === 'number' ? data.duration : null
    const uploader = data.uploader ?? data.channel ?? null

    const formats = data.formats.map(
      (f): VideoFormat => ({
        formatId: f.format_id,
        ext: f.ext,
        resolution: f.resolution ?? (f.vcodec !== 'none' && f.height ? `${f.width}x${f.height}` : 'audio only'),
        filesize: f.filesize ?? f.filesize_approx ?? null,
        note: f.format_note ?? f.resolution ?? '',
        vcodec: f.vcodec ?? 'none',
        acodec: f.acodec ?? 'none',
        fps: f.fps ?? null,
        tbr: f.tbr ?? null,
      })
    )

    return {
      title,
      thumbnail,
      duration,
      uploader,
      formats,
    }
  })

  core.ipc.handle('ytdlp:download', async (payload: unknown) => {
    const { url, formatId, outputDir, metadata, resolution } = payload as {
      url: string
      formatId: string
      outputDir?: string
      metadata: {
        title: string
        thumbnail: string | null
        duration: number | null
        uploader: string | null
      }
      resolution: string
    }
    const jobId = crypto.randomUUID()
    const dir = outputDir ?? config.outputDir
    const outputTemplate = `${dir}/%(title)s.%(ext)s`

    const handle = core.shell.spawn('yt-dlp', [
      '--newline',
      '-f',
      formatId,
      '-o',
      outputTemplate,
      url,
    ])

    const job: DownloadJob = {
      jobId,
      url,
      formatId,
      progress: 0,
      status: 'running',
      metadata,
      resolution,
      handle,
    }
    jobs.set(jobId, job)


    handle.onData((chunk) => {
      const match = PROGRESS_RE.exec(chunk)
      if (match) {
        job.progress = parseFloat(match[1])
      }

      // Try to parse destination path from chunk
      const destMatch = /\[download\] Destination:\s+(.+)/.exec(chunk)
      if (destMatch) {
        job.outputPath = destMatch[1].trim()
      }
      const alreadyMatch = /\[download\]\s+(.+?)\s+has already been downloaded/.exec(chunk)
      if (alreadyMatch) {
        job.outputPath = alreadyMatch[1].trim()
      }
      const mergerMatch = /\[(?:Merger|ffmpeg)\] Merging formats into\s+"(.+?)"/.exec(chunk)
      if (mergerMatch) {
        job.outputPath = mergerMatch[1].trim()
      }
    })

    handle.onClose(async (code) => {
      job.status = code === 0 ? 'done' : 'error'
      if (code === 0) {
        try {
          const history = (await core.storage.read<HistoryItem[]>('history.json')) || []
          const newItem: HistoryItem = {
            id: jobId,
            url,
            title: metadata?.title || 'Unknown Video',
            thumbnail: metadata?.thumbnail || null,
            duration: metadata?.duration || null,
            uploader: metadata?.uploader || null,
            formatId,
            resolution: resolution || formatId,
            outputPath: job.outputPath || null,
            timestamp: Date.now(),
          }
          history.push(newItem)
          await core.storage.write('history.json', history)
        } catch (err) {
          core.logger.error('Failed to save download history', err)
        }
      }
    })

    return { jobId }
  })

  core.ipc.handle('ytdlp:queue', async () => {
    return Array.from(jobs.values()).map(
      ({ jobId, url, formatId, progress, status, outputPath, metadata, resolution }): DownloadJobPublic => ({
        jobId,
        url,
        formatId,
        progress,
        status,
        ...(outputPath !== undefined ? { outputPath } : {}),
        metadata,
        resolution,
      })
    )
  })


  core.ipc.handle('ytdlp:cancel', async (payload: unknown) => {
    const { jobId } = payload as { jobId: string }
    const job = jobs.get(jobId)
    if (job) {
      job.handle.kill('SIGTERM')
      jobs.delete(jobId)
    }
  })

  core.ipc.handle('ytdlp:configure', async (payload: unknown) => {
    const { outputDir } = payload as { outputDir: string }
    config.outputDir = outputDir
    await core.storage.write('config.json', { outputDir })
  })

  core.ipc.handle('ytdlp:history', async (): Promise<HistoryItem[]> => {
    return (await core.storage.read<HistoryItem[]>('history.json')) || []
  })

  core.ipc.handle('ytdlp:open', async (payload: unknown) => {
    const { path, isFolder } = payload as { path: string; isFolder?: boolean }
    if (!path) throw new Error('Path is required')

    let targetPath = path
    if (isFolder) {
      const lastSlash = path.lastIndexOf('/')
      if (lastSlash !== -1) {
        targetPath = path.substring(0, lastSlash)
      }
    }

    await core.shell.open(targetPath)
    return { success: true }
  })
}

