/** @typedef {import('@nuxy/extension-sdk').CoreContext} CoreContext */
import { execFile, spawn } from 'child_process'
import { randomUUID } from 'crypto'
import os from 'os'
import path from 'path'

const PROGRESS_RE = /\[download\]\s+([\d.]+)%/

function checkBinary() {
  return new Promise((resolve) => {
    execFile('which', ['yt-dlp'], (err) => resolve(!err))
  })
}

/** @param {CoreContext} core */
export async function register(core) {
  let config = { outputDir: path.join(os.homedir(), 'Downloads') }

  const saved = await core.storage.read('config.json')
  if (saved?.outputDir) {
    config.outputDir = saved.outputDir
  }

  const installed = await checkBinary()
  if (!installed) {
    core.logger.warn('yt-dlp is not installed. Install it with: pip install yt-dlp')
  }

  const jobs = new Map()

  core.registry.registerTool({ name: 'video-downloader' })

  core.ipc.handle('ytdlp:status', async () => ({ installed }))

  core.ipc.handle('ytdlp:getFormats', ({ url }) => {
    return new Promise((resolve, reject) => {
      execFile('yt-dlp', ['-J', '--no-download', url], { maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
        if (err) {
          if (err.code === 'ENOENT') {
            reject(new Error('yt-dlp is not installed. Install it with: pip install yt-dlp'))
          } else {
            reject(err)
          }
          return
        }
        const data = JSON.parse(stdout)
        const formats = data.formats.map((f) => ({
          formatId: f.format_id,
          ext: f.ext,
          resolution: f.resolution ?? f.format_note ?? 'audio only',
          filesize: f.filesize ?? null,
          note: f.format_note ?? '',
        }))
        resolve(formats)
      })
    })
  })

  core.ipc.handle('ytdlp:download', async ({ url, formatId, outputDir }) => {
    const jobId = randomUUID()
    const dir = outputDir ?? config.outputDir
    const outputTemplate = path.join(dir, '%(title)s.%(ext)s')

    const proc = spawn('yt-dlp', ['--newline', '-f', formatId, '-o', outputTemplate, url], {})

    const job = { jobId, url, formatId, progress: 0, status: 'running', process: proc }
    jobs.set(jobId, job)

    proc.stdout.on('data', (chunk) => {
      const match = PROGRESS_RE.exec(chunk.toString())
      if (match) {
        job.progress = parseFloat(match[1])
      }
    })

    proc.stderr.on('data', () => {})

    proc.on('close', (code) => {
      job.status = code === 0 ? 'done' : 'error'
    })

    return { jobId }
  })

  core.ipc.handle('ytdlp:queue', async () => {
    return Array.from(jobs.values()).map(({ jobId, url, formatId, progress, status, outputPath }) => ({
      jobId,
      url,
      formatId,
      progress,
      status,
      ...(outputPath !== undefined ? { outputPath } : {}),
    }))
  })

  core.ipc.handle('ytdlp:cancel', async ({ jobId }) => {
    const job = jobs.get(jobId)
    if (job) {
      job.process.kill('SIGTERM')
      jobs.delete(jobId)
    }
  })

  core.ipc.handle('ytdlp:configure', async ({ outputDir }) => {
    config.outputDir = outputDir
    await core.storage.write('config.json', { outputDir })
  })
}
