import type { CoreContext } from '@nuxyorg/extension-sdk'
import type { SpawnHandle } from '@nuxyorg/core'
import type {
  DownloadPayload,
  GetFormatsPayload,
  JobIdPayload,
  VideoFormat,
  VideoMetadata,
} from './types.ts'

const EXT_ID = 'com.nuxy.video-downloader'
const DOWNLOAD_MANAGER_ID = 'com.nuxy.download-manager'

const PROGRESS_RE =
  /\[download]\s+([\d.]+)%(?:\s+of\s+([\d.]+)(Ki|Mi|Gi)B)?(?:\s+at\s+([\d.]+)(Ki|Mi|Gi)B\/s)?/
const DESTINATION_RE = /\[download] Destination:\s+(.+)/
const ALREADY_DOWNLOADED_RE = /\[download]\s+(.+?)\s+has already been downloaded/
const MERGED_RE = /\[(?:Merger|ffmpeg)] Merging formats into\s+"(.+?)"/

const VIDEO_URL_RE =
  /^https?:\/\/(?:www\.|m\.)?(youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|twitter\.com|x\.com|instagram\.com|facebook\.com|fb\.watch|dailymotion\.com|twitch\.tv|soundcloud\.com|streamable\.com|reddit\.com)\//i

interface ActiveJob {
  url: string
  formatId: string
  outputTemplate: string
  handle: SpawnHandle
  outputPath: string | null
}

function unitToBytes(value: number, unit: string): number {
  const mult = unit === 'Gi' ? 1024 * 1024 * 1024 : unit === 'Mi' ? 1024 * 1024 : 1024
  return value * mult
}

function parseProgress(
  chunk: string
): { percent: number; totalBytes: number | null; speedBps: number | null } | null {
  const m = PROGRESS_RE.exec(chunk)
  if (!m) return null
  const percent = parseFloat(m[1])
  const totalBytes = m[2] ? unitToBytes(parseFloat(m[2]), m[3]) : null
  const speedBps = m[4] ? unitToBytes(parseFloat(m[4]), m[5]) : null
  return { percent, totalBytes, speedBps }
}

async function checkBinary(core: CoreContext): Promise<boolean> {
  const { code } = await core.shell.exec('which', ['yt-dlp']).catch(() => ({ code: 1, stdout: '' }))
  return code === 0
}

export function register(core: CoreContext): void {
  core.registry.registerTool({ name: 'video-downloader' })
  core.registry.registerProvider({ name: 'video-downloader' })

  const jobs = new Map<string, ActiveJob>()
  let installed: boolean | null = null

  void checkBinary(core).then((ok) => {
    installed = ok
    if (!ok) core.logger.warn('yt-dlp is not installed. Install it with: pip install yt-dlp')
  })

  core.ipc.handle('eval', async (payload: unknown): Promise<{ items: unknown[] }> => {
    const text = (payload as { text?: string } | null | undefined)?.text?.trim() ?? ''
    if (!VIDEO_URL_RE.test(text)) return { items: [] }

    return {
      items: [
        {
          id: EXT_ID,
          title: core.i18n.t('provider.download'),
          subtitle: core.i18n.t('provider.subtitle', { url: text }),
          isTool: true,
          initialQuery: text,
        },
      ],
    }
  })

  function attachHandlers(jobId: string, job: ActiveJob, handle: SpawnHandle): void {
    handle.onData((chunk) => {
      const destMatch = DESTINATION_RE.exec(chunk)
      if (destMatch) job.outputPath = destMatch[1].trim()
      const alreadyMatch = ALREADY_DOWNLOADED_RE.exec(chunk)
      if (alreadyMatch) job.outputPath = alreadyMatch[1].trim()
      const mergerMatch = MERGED_RE.exec(chunk)
      if (mergerMatch) job.outputPath = mergerMatch[1].trim()

      const progress = parseProgress(chunk)
      if (!progress) return
      const bytesDownloaded =
        progress.totalBytes !== null
          ? Math.round((progress.percent / 100) * progress.totalBytes)
          : 0
      void core.extensions.invoke(DOWNLOAD_MANAGER_ID, 'updateExternal', {
        extensionId: EXT_ID,
        jobId,
        status: 'downloading',
        bytesDownloaded,
        totalBytes: progress.totalBytes,
        speedBps: progress.speedBps ?? 0,
        filePath: job.outputPath,
      })
    })

    handle.onClose((code) => {
      const status = code === 0 ? 'completed' : 'failed'
      void core.extensions.invoke(DOWNLOAD_MANAGER_ID, 'updateExternal', {
        extensionId: EXT_ID,
        jobId,
        status,
        speedBps: 0,
        filePath: job.outputPath,
        ...(status === 'failed' ? { error: `yt-dlp exited with code ${code}` } : {}),
      })
      jobs.delete(jobId)
    })
  }

  core.ipc.handle('status', async () => ({
    installed: installed ?? (await checkBinary(core)),
  }))

  core.ipc.handle('getFormats', async (payload: unknown): Promise<VideoMetadata> => {
    const { url } = payload as GetFormatsPayload
    let stdout: string
    try {
      ;({ stdout } = await core.shell.exec('yt-dlp', ['-J', '--no-download', url], {
        maxBuffer: 10 * 1024 * 1024,
      }))
    } catch (err) {
      const e = err as { code?: string }
      if (e.code === 'ENOENT') {
        throw new Error('yt-dlp is not installed. Install it with: pip install yt-dlp')
      }
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
    const thumbnail =
      data.thumbnail ??
      (data.thumbnails && data.thumbnails.length > 0
        ? data.thumbnails[data.thumbnails.length - 1].url
        : null) ??
      null
    const duration = typeof data.duration === 'number' ? data.duration : null
    const uploader = data.uploader ?? data.channel ?? null

    const formats = data.formats.map(
      (f): VideoFormat => ({
        formatId: f.format_id,
        ext: f.ext,
        resolution:
          f.resolution ??
          (f.vcodec !== 'none' && f.height ? `${f.width}x${f.height}` : 'audio only'),
        filesize: f.filesize ?? f.filesize_approx ?? null,
        note: f.format_note ?? f.resolution ?? '',
        vcodec: f.vcodec ?? 'none',
        acodec: f.acodec ?? 'none',
        fps: f.fps ?? null,
        tbr: f.tbr ?? null,
      })
    )

    return { title, thumbnail, duration, uploader, formats }
  })

  core.ipc.handle('download', async (payload: unknown): Promise<{ jobId: string }> => {
    const { url, formatId, metadata } = payload as DownloadPayload

    const downloadDirSetting = (await core.settings.read<string>('downloadPath')) ?? '~/Downloads'
    const dir = downloadDirSetting.startsWith('~/')
      ? `${core.fs.homedir()}/${downloadDirSetting.slice(2)}`
      : downloadDirSetting
    await core.fs.mkdir(dir, { recursive: true })
    const outputTemplate = `${dir}/%(title)s.%(ext)s`

    const jobId = crypto.randomUUID()
    const handle = core.shell.spawn('yt-dlp', [
      '--newline',
      '--continue',
      '-f',
      formatId,
      '-o',
      outputTemplate,
      url,
    ])

    const job: ActiveJob = { url, formatId, outputTemplate, handle, outputPath: null }
    jobs.set(jobId, job)
    attachHandlers(jobId, job, handle)

    await core.extensions.invoke(DOWNLOAD_MANAGER_ID, 'registerExternal', {
      extensionId: EXT_ID,
      jobId,
      url,
      fileName: metadata?.title || 'video',
      filePath: null,
      totalBytes: null,
      thumbnail: metadata?.thumbnail ?? null,
    })

    core.logger.info(`Queued video download: ${url} -> ${dir}`)
    return { jobId }
  })

  core.ipc.handle('pause', async (payload: unknown): Promise<void> => {
    const { jobId } = payload as JobIdPayload
    jobs.get(jobId)?.handle.kill('SIGTERM')
  })

  core.ipc.handle('resume', async (payload: unknown): Promise<void> => {
    const { jobId } = payload as JobIdPayload
    const job = jobs.get(jobId)
    if (!job) return
    const handle = core.shell.spawn('yt-dlp', [
      '--newline',
      '--continue',
      '-f',
      job.formatId,
      '-o',
      job.outputTemplate,
      job.url,
    ])
    job.handle = handle
    attachHandlers(jobId, job, handle)
  })

  core.ipc.handle('cancel', async (payload: unknown): Promise<void> => {
    const { jobId } = payload as JobIdPayload
    const job = jobs.get(jobId)
    if (!job) return
    job.handle.kill('SIGTERM')
    if (job.outputPath && (await core.fs.fileExists(job.outputPath))) {
      await core.fs.rm(job.outputPath)
    }
    jobs.delete(jobId)
  })
}
