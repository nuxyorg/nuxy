import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { type CoreContext, createMockCore } from '@nuxy/extension-sdk'

interface SpawnHandle {
  onData: ReturnType<typeof vi.fn>
  onClose: ReturnType<typeof vi.fn>
  kill: ReturnType<typeof vi.fn>
  _emit: {
    data: (chunk: string) => void
    close: (code: number) => void
  }
}

function makeSpawnHandle(): SpawnHandle {
  let dataHandler: ((chunk: string) => void) | null = null
  let closeHandler: ((code: number | null) => void) | null = null
  return {
    onData: vi.fn((fn: (chunk: string) => void) => {
      dataHandler = fn
    }),
    onClose: vi.fn((fn: (code: number | null) => void) => {
      closeHandler = fn
    }),
    kill: vi.fn(),
    _emit: {
      data: (chunk) => dataHandler?.(chunk),
      close: (code) => closeHandler?.(code),
    },
  }
}

function createCore() {
  const storage: Record<string, unknown> = {}
  const { core, handlers } = createMockCore(vi, {
    storage: {
      read: vi.fn(async (key: string) => storage[key] ?? null),
      write: vi.fn(async (key: string, val: unknown) => {
        storage[key] = val
      }),
    },
    shell: {
      exec: vi.fn().mockResolvedValue({ stdout: '/usr/bin/yt-dlp', code: 0 }),
      spawn: vi.fn().mockReturnValue(makeSpawnHandle()),
    },
  })
  return { core, handlers, storage }
}

beforeEach(async () => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function freshBackend() {
  const mod = await import('./backend.ts')
  return mod.register
}

describe('video-downloader backend', () => {
  it('registers as a tool named "video-downloader"', async () => {
    const register = await freshBackend()
    const { core } = createCore()
    await register(core)
    expect(core.registry.registerTool as ReturnType<typeof vi.fn>).toHaveBeenCalledWith({
      name: 'video-downloader',
    })
  })

  // ─── ytdlp:status ────────────────────────────────────────────────────────────

  describe('ytdlp:status', () => {
    it('returns { installed: true } when yt-dlp binary is found', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      ;(core.shell.exec as ReturnType<typeof vi.fn>).mockResolvedValue({
        stdout: '/usr/bin/yt-dlp',
        code: 0,
      })
      await register(core)
      const result = await handlers['ytdlp:status'](undefined)
      expect(result).toEqual({ installed: true })
    })

    it('returns { installed: false } when yt-dlp binary is missing', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      ;(core.shell.exec as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('not found'))
      await register(core)
      const result = await handlers['ytdlp:status'](undefined)
      expect(result).toEqual({ installed: false })
    })
  })

  // ─── ytdlp:getFormats ────────────────────────────────────────────────────────

  describe('ytdlp:getFormats', () => {
    it('calls core.shell.exec with yt-dlp and correct args', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)
      ;(core.shell.exec as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        stdout: JSON.stringify({ formats: [] }),
        code: 0,
      })

      await handlers['ytdlp:getFormats']({ url: 'https://youtube.com/watch?v=test' })
      expect(core.shell.exec).toHaveBeenCalledWith(
        'yt-dlp',
        ['-J', '--no-download', 'https://youtube.com/watch?v=test'],
        { maxBuffer: 10 * 1024 * 1024 }
      )
    })

    it('parses yt-dlp JSON output and returns Format array with correct fields', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      const fakeFormats = [
        {
          format_id: '137',
          ext: 'mp4',
          resolution: '1920x1080',
          filesize: 102400,
          format_note: 'HD',
        },
        {
          format_id: '140',
          ext: 'm4a',
          resolution: null,
          filesize: null,
          format_note: 'audio only',
        },
      ]
      ;(core.shell.exec as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        stdout: JSON.stringify({
          title: 'Test Video Title',
          thumbnail: 'https://example.com/thumb.jpg',
          duration: 360,
          uploader: 'Test Channel',
          formats: fakeFormats,
        }),
        code: 0,
      })

      const result = (await handlers['ytdlp:getFormats']({ url: 'https://example.com/video' })) as any
      expect(result.title).toBe('Test Video Title')
      expect(result.thumbnail).toBe('https://example.com/thumb.jpg')
      expect(result.duration).toBe(360)
      expect(result.uploader).toBe('Test Channel')
      expect(result.formats).toHaveLength(2)
      expect(result.formats[0]).toEqual({
        formatId: '137',
        ext: 'mp4',
        resolution: '1920x1080',
        filesize: 102400,
        note: 'HD',
        vcodec: 'none',
        acodec: 'none',
        fps: null,
        tbr: null,
      })
      expect(result.formats[1]).toEqual({
        formatId: '140',
        ext: 'm4a',
        resolution: 'audio only',
        filesize: null,
        note: 'audio only',
        vcodec: 'none',
        acodec: 'none',
        fps: null,
        tbr: null,
      })
    })

    it('throws a helpful error message when yt-dlp is not installed (ENOENT)', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      const enoentErr = Object.assign(new Error('spawn yt-dlp ENOENT'), { code: 'ENOENT' })
      ;(core.shell.exec as ReturnType<typeof vi.fn>).mockRejectedValueOnce(enoentErr)

      await expect(
        handlers['ytdlp:getFormats']({ url: 'https://example.com/video' })
      ).rejects.toThrow('yt-dlp is not installed. Install it with: pip install yt-dlp')
    })
  })

  // ─── ytdlp:download ──────────────────────────────────────────────────────────

  describe('ytdlp:download', () => {
    it('calls core.shell.spawn with correct args', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      await handlers['ytdlp:download']({
        url: 'https://example.com/video',
        formatId: '137',
        outputDir: '/tmp/downloads',
      })

      expect(core.shell.spawn).toHaveBeenCalledWith(
        'yt-dlp',
        expect.arrayContaining(['--newline', '-f', '137', 'https://example.com/video'])
      )
    })

    it('returns a jobId string', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      const result = (await handlers['ytdlp:download']({
        url: 'https://example.com/video',
        formatId: '137',
      })) as { jobId: string }

      expect(typeof result.jobId).toBe('string')
      expect(result.jobId.length).toBeGreaterThan(0)
    })

    it('updates job progress when stdout emits a [download] 45.2% line', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      const handle = makeSpawnHandle()
      ;(core.shell.spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(handle)

      const { jobId } = (await handlers['ytdlp:download']({
        url: 'https://example.com/video',
        formatId: '137',
      })) as { jobId: string }

      handle._emit.data('[download]  45.2% of 128.34MiB\n')

      const jobs = (await handlers['ytdlp:queue'](undefined)) as Array<{
        jobId: string
        progress: number
      }>
      const job = jobs.find((j) => j.jobId === jobId)
      expect(job!.progress).toBeCloseTo(45.2)
    })

    it('sets job status to "done" when process exits with code 0', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      const handle = makeSpawnHandle()
      ;(core.shell.spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(handle)

      const { jobId } = (await handlers['ytdlp:download']({
        url: 'https://example.com/video',
        formatId: '137',
      })) as { jobId: string }

      handle._emit.close(0)

      const jobs = (await handlers['ytdlp:queue'](undefined)) as Array<{
        jobId: string
        status: string
      }>
      const job = jobs.find((j) => j.jobId === jobId)
      expect(job!.status).toBe('done')
    })

    it('sets job status to "error" when process exits with non-zero code', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      const handle = makeSpawnHandle()
      ;(core.shell.spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(handle)

      const { jobId } = (await handlers['ytdlp:download']({
        url: 'https://example.com/video',
        formatId: '137',
      })) as { jobId: string }

      handle._emit.close(1)

      const jobs = (await handlers['ytdlp:queue'](undefined)) as Array<{
        jobId: string
        status: string
      }>
      const job = jobs.find((j) => j.jobId === jobId)
      expect(job!.status).toBe('error')
    })
  })

  // ─── ytdlp:queue ─────────────────────────────────────────────────────────────

  describe('ytdlp:queue', () => {
    it('returns current jobs array without process reference', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      await handlers['ytdlp:download']({ url: 'https://example.com/video', formatId: '137' })

      const jobs = (await handlers['ytdlp:queue'](undefined)) as unknown[]
      expect(Array.isArray(jobs)).toBe(true)
      expect(jobs).toHaveLength(1)

      const job = jobs[0] as Record<string, unknown>
      expect(job).toHaveProperty('jobId')
      expect(job).toHaveProperty('url')
      expect(job).toHaveProperty('formatId')
      expect(job).toHaveProperty('progress')
      expect(job).toHaveProperty('status')
      expect(job).not.toHaveProperty('handle')
    })
  })

  // ─── ytdlp:cancel ────────────────────────────────────────────────────────────

  describe('ytdlp:cancel', () => {
    it('kills the process handle and removes the job', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      const handle = makeSpawnHandle()
      ;(core.shell.spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(handle)

      const { jobId } = (await handlers['ytdlp:download']({
        url: 'https://example.com/video',
        formatId: '137',
      })) as { jobId: string }

      await handlers['ytdlp:cancel']({ jobId })

      expect(handle.kill).toHaveBeenCalledWith('SIGTERM')

      const jobs = (await handlers['ytdlp:queue'](undefined)) as Array<{ jobId: string }>
      expect(jobs.find((j) => j.jobId === jobId)).toBeUndefined()
    })
  })

  // ─── ytdlp:configure ─────────────────────────────────────────────────────────

  describe('ytdlp:configure', () => {
    it('writes outputDir to storage', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      await handlers['ytdlp:configure']({ outputDir: '/home/user/Videos' })

      expect(core.storage.write).toHaveBeenCalledWith('config.json', {
        outputDir: '/home/user/Videos',
      })
    })
  })

  // ─── Progress regex ──────────────────────────────────────────────────────────

  describe('progress regex', () => {
    it('correctly extracts percentage from [download]  45.2% of 128.34MiB format', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      const handle = makeSpawnHandle()
      ;(core.shell.spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(handle)

      const { jobId } = (await handlers['ytdlp:download']({
        url: 'https://example.com/video',
        formatId: '140',
      })) as { jobId: string }

      handle._emit.data('[download]  45.2% of 128.34MiB at 1.23MiB/s ETA 00:42\n')

      const jobs = (await handlers['ytdlp:queue'](undefined)) as Array<{
        jobId: string
        progress: number
      }>
      const job = jobs.find((j) => j.jobId === jobId)
      expect(job!.progress).toBeCloseTo(45.2)
    })
  })
})
