import type { CoreContext, IpcInvokeContext } from '@nuxyorg/extension-sdk'
import type { SpawnHandle } from '@nuxyorg/core'
import type {
  DownloadPayload,
  GetFormatsPayload,
  JobIdPayload,
  VideoFormat,
  VideoMetadata,
} from './types.ts'
import { isVideoUrl } from './utils/video-url.ts'
import { assertJobControl } from './utils/job-control.ts'
import { parseExtraArgs } from './utils/parse-args.ts'
import { resolveThumbnailUrl } from './utils/fetch-thumbnail.ts'

const EXT_ID = 'com.nuxy.video-downloader'
const DOWNLOAD_MANAGER_ID = 'com.nuxy.download-manager'

const PROGRESS_RE =
  /\[download]\s+([\d.]+)%(?:\s+of\s+([\d.]+)(Ki|Mi|Gi)B)?(?:\s+at\s+([\d.]+)(Ki|Mi|Gi)B\/s)?/
const DESTINATION_RE = /\[download] Destination:\s+(.+)/
const ALREADY_DOWNLOADED_RE = /\[download]\s+(.+?)\s+has already been downloaded/
const MERGED_RE = /\[(?:Merger|ffmpeg)] Merging formats into\s+"(.+?)"/

let ytdlpBin: string | null | undefined

async function readExtraArgs(core: CoreContext): Promise<string[]> {
  return parseExtraArgs(await core.settings.read<string>('extraArgs'))
}

interface ActiveJob {
  url: string
  formatId: string
  outputTemplate: string
  extraArgs: string[]
  handle: SpawnHandle
  outputPath: string | null
  controllerExtId: string
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

function resolveDownloadDir(core: CoreContext, rawSetting: string | null | undefined): string {
  const downloadDirSetting = rawSetting?.trim() || '~/Downloads'
  return downloadDirSetting.startsWith('~/')
    ? `${core.fs.homedir()}/${downloadDirSetting.slice(2)}`
    : downloadDirSetting
}

async function resolveYtdlpBin(core: CoreContext): Promise<string | null> {
  if (ytdlpBin !== undefined) return ytdlpBin

  const whichResult = await core.shell.exec('which', ['yt-dlp']).catch((err) => {
    core.logger.warn('Failed to check yt-dlp binary', err)
    return { code: 1, stdout: '' }
  })
  const { code, stdout } = whichResult
  const resolved = code === 0 && stdout.trim() ? stdout.trim() : null
  ytdlpBin = resolved
  return resolved
}

async function checkBinary(core: CoreContext): Promise<boolean> {
  return (await resolveYtdlpBin(core)) !== null
}

export function register(core: CoreContext): void {
  ytdlpBin = undefined
  core.registry.registerTool({ name: 'video-downloader' })
  core.registry.registerProvider({ name: 'video-downloader' })

  const jobs = new Map<string, ActiveJob>()
  let installed: boolean | null = null

  void checkBinary(core).then((ok) => {
    installed = ok
    if (!ok) core.logger.warn('yt-dlp is not installed. Install it with: pip install yt-dlp')
  })

  core.ipc.handle(
    'eval',
    async (payload: unknown): Promise<{ items: unknown[] }> => {
      const text = (payload as { text?: string } | null | undefined)?.text?.trim() ?? ''
      if (!isVideoUrl(text)) return { items: [] }

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
    },
    { expose: 'public' }
  )

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
    const bin = await resolveYtdlpBin(core)
    if (!bin) throw new Error(core.i18n.t('install.notInstalled'))

    const extraArgs = await readExtraArgs(core)
    const execArgs = ['-J', '--no-download', ...extraArgs, url]

    let stdout: string
    let code: number
    try {
      ;({ stdout, code } = await core.shell.exec(bin, execArgs, {
        maxBuffer: 10 * 1024 * 1024,
      }))
    } catch (err) {
      const e = err as { code?: string }
      if (e.code === 'ENOENT') {
        throw new Error(core.i18n.t('install.notInstalled'))
      }
      throw err
    }

    if (code !== 0) {
      throw new Error(core.i18n.t('errors.fetchFailed'))
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(stdout)
    } catch {
      throw new Error(core.i18n.t('errors.fetchFailed'))
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error(core.i18n.t('errors.fetchFailed'))
    }

    const data = parsed as {
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
    const rawThumbnail =
      data.thumbnail ??
      (data.thumbnails && data.thumbnails.length > 0
        ? data.thumbnails[data.thumbnails.length - 1].url
        : null) ??
      null
    const thumbnail = await resolveThumbnailUrl(core, rawThumbnail, extraArgs)
    const duration = typeof data.duration === 'number' ? data.duration : null
    const uploader = data.uploader ?? data.channel ?? null

    if (!Array.isArray(data.formats)) {
      throw new Error(core.i18n.t('errors.noFormats'))
    }

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
    const bin = await resolveYtdlpBin(core)
    if (!bin) throw new Error(core.i18n.t('install.notInstalled'))

    const dir = resolveDownloadDir(core, await core.settings.read<string>('downloadPath'))
    try {
      await core.fs.mkdir(dir, { recursive: true })
    } catch {
      throw new Error(core.i18n.t('errors.downloadFailed'))
    }
    const outputTemplate = `${dir}/%(title)s.%(ext)s`
    const extraArgs = await readExtraArgs(core)
    const spawnArgs = [
      '--newline',
      '--continue',
      '-f',
      formatId,
      '-o',
      outputTemplate,
      ...extraArgs,
      url,
    ]

    const jobId = crypto.randomUUID()
    const handle = core.shell.spawn(bin, spawnArgs)

    const job: ActiveJob = {
      url,
      formatId,
      outputTemplate,
      extraArgs,
      handle,
      outputPath: null,
      controllerExtId: DOWNLOAD_MANAGER_ID,
    }
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

  core.ipc.handle(
    'pause',
    async (payload: unknown, context?: IpcInvokeContext): Promise<void> => {
      const { jobId } = payload as JobIdPayload
      const job = jobs.get(jobId)
      if (!job) return
      assertJobControl(job, EXT_ID, context)
      job.handle.kill('SIGTERM')
    },
    { expose: 'public' }
  )

  core.ipc.handle(
    'resume',
    async (payload: unknown, context?: IpcInvokeContext): Promise<void> => {
      const { jobId } = payload as JobIdPayload
      const job = jobs.get(jobId)
      if (!job) return
      assertJobControl(job, EXT_ID, context)
      const bin = (await resolveYtdlpBin(core)) ?? 'yt-dlp'
      const handle = core.shell.spawn(bin, [
        '--newline',
        '--continue',
        '-f',
        job.formatId,
        '-o',
        job.outputTemplate,
        ...job.extraArgs,
        job.url,
      ])
      job.handle = handle
      attachHandlers(jobId, job, handle)
    },
    { expose: 'public' }
  )

  core.ipc.handle(
    'cancel',
    async (payload: unknown, context?: IpcInvokeContext): Promise<void> => {
      const { jobId } = payload as JobIdPayload
      const job = jobs.get(jobId)
      if (!job) return
      assertJobControl(job, EXT_ID, context)
      job.handle.kill('SIGTERM')
      if (job.outputPath && (await core.fs.fileExists(job.outputPath))) {
        await core.fs.rm(job.outputPath)
      }
      jobs.delete(jobId)
    },
    { expose: 'public' }
  )
}
