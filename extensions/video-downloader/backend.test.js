import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { execFile, spawn } from 'child_process'

vi.mock('child_process', () => ({
  execFile: vi.fn((_cmd, _args, cb) => cb(null, '', '')),
  spawn: vi.fn(() => ({
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn(),
    kill: vi.fn(),
    pid: 1234,
  })),
}))

function createCore() {
  const handlers = {}
  const storage = {}
  const core = {
    registry: { registerTool: vi.fn() },
    ipc: { handle: (ch, fn) => { handlers[ch] = fn } },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    storage: {
      read: vi.fn(async (key) => storage[key] ?? null),
      write: vi.fn(async (key, val) => { storage[key] = val }),
    },
  }
  return { core, handlers, storage }
}

beforeEach(async () => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function freshBackend() {
  const mod = await import('./backend.js')
  return mod.register
}

describe('video-downloader backend', () => {
  it('registers as a tool named "video-downloader"', async () => {
    const register = await freshBackend()
    const { core } = createCore()
    await register(core)
    expect(core.registry.registerTool).toHaveBeenCalledWith({ name: 'video-downloader' })
  })

  // ─── ytdlp:status ────────────────────────────────────────────────────────────

  describe('ytdlp:status', () => {
    it('returns { installed: true } when yt-dlp binary is found', async () => {
      execFile.mockImplementation((_cmd, _args, cb) => cb(null, '/usr/bin/yt-dlp', ''))
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)
      const result = await handlers['ytdlp:status']()
      expect(result).toEqual({ installed: true })
    })

    it('returns { installed: false } when yt-dlp binary is missing', async () => {
      execFile.mockImplementation((_cmd, _args, cb) => cb(new Error('not found'), '', ''))
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)
      const result = await handlers['ytdlp:status']()
      expect(result).toEqual({ installed: false })
    })
  })

  // ─── ytdlp:getFormats ────────────────────────────────────────────────────────

  describe('ytdlp:getFormats', () => {
    it('calls execFile with yt-dlp and correct args', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      const { execFile: mockExecFile } = await import('child_process')
      mockExecFile.mockImplementationOnce((_cmd, _args, _opts, cb) =>
        cb(null, JSON.stringify({ formats: [] }), '')
      )

      await handlers['ytdlp:getFormats']({ url: 'https://youtube.com/watch?v=test' })
      expect(mockExecFile).toHaveBeenCalledWith(
        'yt-dlp',
        ['-J', '--no-download', 'https://youtube.com/watch?v=test'],
        { maxBuffer: 10 * 1024 * 1024 },
        expect.any(Function)
      )
    })

    it('parses yt-dlp JSON output and returns Format array with correct fields', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      const { execFile: mockExecFile } = await import('child_process')
      const fakeFormats = [
        { format_id: '137', ext: 'mp4', resolution: '1920x1080', filesize: 102400, format_note: 'HD' },
        { format_id: '140', ext: 'm4a', resolution: null, filesize: null, format_note: 'audio only' },
      ]
      mockExecFile.mockImplementationOnce((_cmd, _args, _opts, cb) =>
        cb(null, JSON.stringify({ formats: fakeFormats }), '')
      )

      const result = await handlers['ytdlp:getFormats']({ url: 'https://example.com/video' })
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        formatId: '137',
        ext: 'mp4',
        resolution: '1920x1080',
        filesize: 102400,
        note: 'HD',
      })
      expect(result[1]).toEqual({
        formatId: '140',
        ext: 'm4a',
        resolution: 'audio only',
        filesize: null,
        note: 'audio only',
      })
    })

    it('throws a helpful error message when yt-dlp is not installed (ENOENT)', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      const { execFile: mockExecFile } = await import('child_process')
      const enoentErr = new Error('spawn yt-dlp ENOENT')
      enoentErr.code = 'ENOENT'
      mockExecFile.mockImplementationOnce((_cmd, _args, _opts, cb) => cb(enoentErr, '', ''))

      await expect(handlers['ytdlp:getFormats']({ url: 'https://example.com/video' }))
        .rejects.toThrow('yt-dlp is not installed. Install it with: pip install yt-dlp')
    })
  })

  // ─── ytdlp:download ──────────────────────────────────────────────────────────

  describe('ytdlp:download', () => {
    it('calls spawn with correct args', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      const { spawn: mockSpawn } = await import('child_process')

      await handlers['ytdlp:download']({
        url: 'https://example.com/video',
        formatId: '137',
        outputDir: '/tmp/downloads',
      })

      expect(mockSpawn).toHaveBeenCalledWith(
        'yt-dlp',
        expect.arrayContaining(['--newline', '-f', '137', 'https://example.com/video']),
        expect.anything()
      )
    })

    it('returns a jobId string', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      const result = await handlers['ytdlp:download']({
        url: 'https://example.com/video',
        formatId: '137',
      })

      expect(typeof result.jobId).toBe('string')
      expect(result.jobId.length).toBeGreaterThan(0)
    })

    it('updates job progress when stdout emits a [download] 45.2% line', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      const { spawn: mockSpawn } = await import('child_process')

      const stdoutHandlers = {}
      const procHandlers = {}
      mockSpawn.mockReturnValueOnce({
        stdout: { on: vi.fn((evt, cb) => { stdoutHandlers[evt] = cb }) },
        stderr: { on: vi.fn() },
        on: vi.fn((evt, cb) => { procHandlers[evt] = cb }),
        kill: vi.fn(),
        pid: 5678,
      })

      const { jobId } = await handlers['ytdlp:download']({
        url: 'https://example.com/video',
        formatId: '137',
      })

      stdoutHandlers['data'](Buffer.from('[download]  45.2% of 128.34MiB\n'))

      const jobs = await handlers['ytdlp:queue']()
      const job = jobs.find((j) => j.jobId === jobId)
      expect(job.progress).toBeCloseTo(45.2)
    })

    it('sets job status to "done" when process exits with code 0', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      const { spawn: mockSpawn } = await import('child_process')

      const procHandlers = {}
      mockSpawn.mockReturnValueOnce({
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((evt, cb) => { procHandlers[evt] = cb }),
        kill: vi.fn(),
        pid: 5678,
      })

      const { jobId } = await handlers['ytdlp:download']({
        url: 'https://example.com/video',
        formatId: '137',
      })

      procHandlers['close'](0)

      const jobs = await handlers['ytdlp:queue']()
      const job = jobs.find((j) => j.jobId === jobId)
      expect(job.status).toBe('done')
    })

    it('sets job status to "error" when process exits with non-zero code', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      const { spawn: mockSpawn } = await import('child_process')

      const procHandlers = {}
      mockSpawn.mockReturnValueOnce({
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((evt, cb) => { procHandlers[evt] = cb }),
        kill: vi.fn(),
        pid: 5678,
      })

      const { jobId } = await handlers['ytdlp:download']({
        url: 'https://example.com/video',
        formatId: '137',
      })

      procHandlers['close'](1)

      const jobs = await handlers['ytdlp:queue']()
      const job = jobs.find((j) => j.jobId === jobId)
      expect(job.status).toBe('error')
    })
  })

  // ─── ytdlp:queue ─────────────────────────────────────────────────────────────

  describe('ytdlp:queue', () => {
    it('returns current jobs array without process reference', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      await handlers['ytdlp:download']({ url: 'https://example.com/video', formatId: '137' })

      const jobs = await handlers['ytdlp:queue']()
      expect(Array.isArray(jobs)).toBe(true)
      expect(jobs).toHaveLength(1)

      const job = jobs[0]
      expect(job).toHaveProperty('jobId')
      expect(job).toHaveProperty('url')
      expect(job).toHaveProperty('formatId')
      expect(job).toHaveProperty('progress')
      expect(job).toHaveProperty('status')
      expect(job).not.toHaveProperty('process')
    })
  })

  // ─── ytdlp:cancel ────────────────────────────────────────────────────────────

  describe('ytdlp:cancel', () => {
    it('kills the child process and removes the job', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      const { spawn: mockSpawn } = await import('child_process')

      const killFn = vi.fn()
      mockSpawn.mockReturnValueOnce({
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: killFn,
        pid: 9999,
      })

      const { jobId } = await handlers['ytdlp:download']({
        url: 'https://example.com/video',
        formatId: '137',
      })

      await handlers['ytdlp:cancel']({ jobId })

      expect(killFn).toHaveBeenCalledWith('SIGTERM')

      const jobs = await handlers['ytdlp:queue']()
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

      expect(core.storage.write).toHaveBeenCalledWith('config.json', { outputDir: '/home/user/Videos' })
    })
  })

  // ─── Progress regex ──────────────────────────────────────────────────────────

  describe('progress regex', () => {
    it('correctly extracts percentage from [download]  45.2% of 128.34MiB format', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      const { spawn: mockSpawn } = await import('child_process')

      const stdoutHandlers = {}
      const procHandlers = {}
      mockSpawn.mockReturnValueOnce({
        stdout: { on: vi.fn((evt, cb) => { stdoutHandlers[evt] = cb }) },
        stderr: { on: vi.fn() },
        on: vi.fn((evt, cb) => { procHandlers[evt] = cb }),
        kill: vi.fn(),
        pid: 1111,
      })

      const { jobId } = await handlers['ytdlp:download']({
        url: 'https://example.com/video',
        formatId: '140',
      })

      stdoutHandlers['data'](Buffer.from('[download]  45.2% of 128.34MiB at 1.23MiB/s ETA 00:42\n'))

      const jobs = await handlers['ytdlp:queue']()
      const job = jobs.find((j) => j.jobId === jobId)
      expect(job.progress).toBeCloseTo(45.2)
    })
  })
})
